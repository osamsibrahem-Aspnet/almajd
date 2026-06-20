import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AccountApiService, Notification, NotificationPreference } from '../services/account-api.service';

@Component({
  selector: 'app-notifications-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  styles: [`
    .notif-item {
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      background: var(--bg-elev);
    }
    .notif-item.unread { border-left: 3px solid var(--primary); }
    .pref-table th, .pref-table td { vertical-align: middle; font-size: 0.875rem; }
  `],
  template: `
    <div class="page-header">
      <h2>{{ 'account.notifications' | translate }}</h2>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-4">
      <li class="nav-item">
        <button class="nav-link" [class.active]="activeTab === 'inbox'" (click)="activeTab = 'inbox'">
          {{ 'account.inbox' | translate }}
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" [class.active]="activeTab === 'prefs'" (click)="activeTab = 'prefs'">
          {{ 'account.notifPreferences' | translate }}
        </button>
      </li>
    </ul>

    <!-- Inbox tab -->
    <div *ngIf="activeTab === 'inbox'">
      <div *ngIf="loadingNotif" class="text-center py-4">
        <div class="spinner-border text-primary"></div>
      </div>

      <div *ngIf="!loadingNotif && notifications.length === 0" class="text-center py-5 text-muted">
        <i class="fas fa-bell-slash fa-3x mb-3 d-block"></i>
        {{ 'account.noNotifications' | translate }}
      </div>

      <div *ngIf="!loadingNotif && notifications.length > 0" class="d-flex flex-column gap-2">
        <div *ngFor="let n of notifications"
             class="notif-item"
             [class.unread]="n.status === 'Unread'">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-semibold small">{{ n.title }}</div>
              <div class="text-muted small mt-1" *ngIf="n.body">{{ n.body }}</div>
            </div>
            <div class="text-end flex-shrink-0">
              <div class="text-muted" style="font-size:0.75rem;">{{ n.createdAt | date:'short' }}</div>
              <span *ngIf="n.category" class="badge bg-secondary mt-1" style="font-size:0.7rem;">{{ n.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Preferences tab -->
    <div *ngIf="activeTab === 'prefs'">
      <div *ngIf="loadingPrefs" class="text-center py-4">
        <div class="spinner-border text-primary"></div>
      </div>

      <div *ngIf="!loadingPrefs">
        <div class="card">
          <div class="card-body">
            <div *ngIf="prefSaveMsg" class="alert py-2 mb-3 small"
                 [class.alert-success]="prefSaveSuccess"
                 [class.alert-danger]="!prefSaveSuccess">
              {{ prefSaveMsg }}
            </div>

            <div *ngIf="preferences.length === 0" class="text-muted small">
              {{ 'account.noPreferences' | translate }}
            </div>

            <div *ngIf="preferences.length > 0" class="table-responsive">
              <table class="table pref-table">
                <thead class="table-light">
                  <tr>
                    <th>{{ 'account.category' | translate }}</th>
                    <th class="text-center">{{ 'account.email' | translate }}</th>
                    <th class="text-center">{{ 'account.sms' | translate }}</th>
                    <th class="text-center">{{ 'account.push' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let pref of preferences">
                    <td>{{ pref.category }}</td>
                    <td class="text-center">
                      <input type="checkbox" class="form-check-input"
                             [(ngModel)]="pref.emailEnabled"
                             [ngModelOptions]="{standalone: true}">
                    </td>
                    <td class="text-center">
                      <input type="checkbox" class="form-check-input"
                             [(ngModel)]="pref.smsEnabled"
                             [ngModelOptions]="{standalone: true}">
                    </td>
                    <td class="text-center">
                      <input type="checkbox" class="form-check-input"
                             [(ngModel)]="pref.pushEnabled"
                             [ngModelOptions]="{standalone: true}">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button class="btn btn-primary btn-sm mt-2" style="min-height:44px;"
                    [disabled]="savingPrefs || preferences.length === 0"
                    (click)="savePrefs()">
              <span *ngIf="savingPrefs" class="spinner-border spinner-border-sm me-2"></span>
              {{ 'common.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationsInboxComponent implements OnInit {
  activeTab: 'inbox' | 'prefs' = 'inbox';
  notifications: Notification[] = [];
  preferences: NotificationPreference[] = [];
  loadingNotif = true;
  loadingPrefs = true;
  savingPrefs = false;
  prefSaveMsg = '';
  prefSaveSuccess = false;

  constructor(private accountApi: AccountApiService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.accountApi.getNotifications({ page: 1, pageSize: 50 }).subscribe({
      next: res => {
        this.loadingNotif = false;
        if (res.isSuccess && res.data) {
          const d = res.data as any;
          this.notifications = Array.isArray(d) ? d : (d.items ?? []);
        }
      },
      error: () => { this.loadingNotif = false; }
    });

    this.accountApi.getNotificationPreferences().subscribe({
      next: res => {
        this.loadingPrefs = false;
        if (res.isSuccess && res.data) {
          this.preferences = Array.isArray(res.data) ? res.data : [];
        }
      },
      error: () => { this.loadingPrefs = false; }
    });
  }

  savePrefs(): void {
    this.savingPrefs = true;
    this.prefSaveMsg = '';
    this.accountApi.updateNotificationPreferences(this.preferences).subscribe({
      next: res => {
        this.savingPrefs = false;
        this.prefSaveMsg = res.isSuccess ? 'common.save' : res.message;
        this.prefSaveSuccess = res.isSuccess;
      },
      error: (err: any) => {
        this.savingPrefs = false;
        this.prefSaveMsg = err?.message ?? 'Save failed.';
        this.prefSaveSuccess = false;
      }
    });
  }
}
