import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { AuthService } from '../core/auth/auth.service';

type LoginTab = 'staff' | 'customer';
type OtpStep = 'phone' | 'code';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  styles: [`
    .otp-inputs {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    .otp-digit {
      width: 44px;
      height: 52px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: 700;
      border: 1px solid var(--border);
      border-radius: 0.375rem;
    }
    .otp-digit:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 0.2rem var(--primary-soft);
      outline: none;
    }
  `],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center"
         style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);">
      <div class="card shadow-sm" style="width: 440px; max-width: 95vw;">
        <div class="card-body p-4">
          <!-- Logo / brand -->
          <div class="text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                 style="width: 56px; height: 56px; background-color: var(--primary);">
              <i class="fas fa-store-alt fa-lg text-white"></i>
            </div>
            <h1 class="h4 fw-bold mb-1" style="color: var(--fg);">
              {{ 'auth.loginTitle' | translate }}
            </h1>
            <p class="text-muted small mb-0">{{ 'auth.loginSubtitle' | translate }}</p>
          </div>

          <!-- Tab toggle -->
          <ul class="nav nav-pills nav-fill mb-4">
            <li class="nav-item">
              <button
                class="nav-link w-100"
                [class.active]="activeTab === 'staff'"
                (click)="switchTab('staff')">
                <i class="fas fa-user-tie me-1"></i>
                {{ 'auth.tabStaff' | translate }}
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link w-100"
                [class.active]="activeTab === 'customer'"
                (click)="switchTab('customer')">
                <i class="fas fa-mobile-alt me-1"></i>
                {{ 'auth.tabCustomer' | translate }}
              </button>
            </li>
          </ul>

          <!-- Error alert -->
          <div *ngIf="errorMessage" class="alert alert-danger py-2" role="alert">
            <small>{{ errorMessage }}</small>
            <ul *ngIf="errorList.length" class="mb-0 mt-1 ps-3">
              <li *ngFor="let e of errorList"><small>{{ e }}</small></li>
            </ul>
          </div>

          <!-- Success alert -->
          <div *ngIf="successMessage" class="alert alert-success py-2" role="alert">
            <small>{{ successMessage }}</small>
          </div>

          <!-- Staff tab: email/password -->
          <form *ngIf="activeTab === 'staff'" [formGroup]="staffForm" (ngSubmit)="onStaffSubmit()">
            <div class="mb-3">
              <label class="form-label fw-medium small">{{ 'auth.email' | translate }}</label>
              <input
                type="email"
                class="form-control"
                style="font-size:14px;"
                formControlName="email"
                autocomplete="username"
                [class.is-invalid]="staffEmail.touched && staffEmail.invalid">
              <small class="text-danger" *ngIf="staffEmail.touched && staffEmail.hasError('required')">
                {{ 'auth.emailRequired' | translate }}
              </small>
              <small class="text-danger" *ngIf="staffEmail.touched && staffEmail.hasError('email')">
                {{ 'auth.emailInvalid' | translate }}
              </small>
            </div>

            <div class="mb-4">
              <label class="form-label fw-medium small">{{ 'auth.password' | translate }}</label>
              <input
                type="password"
                class="form-control"
                style="font-size:14px;"
                formControlName="password"
                autocomplete="current-password"
                [class.is-invalid]="staffPassword.touched && staffPassword.invalid">
              <small class="text-danger" *ngIf="staffPassword.touched && staffPassword.hasError('required')">
                {{ 'auth.passwordRequired' | translate }}
              </small>
            </div>

            <button type="submit" class="btn btn-primary w-100" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ 'auth.loginButton' | translate }}
            </button>
          </form>

          <!-- Customer tab: OTP flow -->
          <div *ngIf="activeTab === 'customer'">

            <!-- Step 1: Phone input -->
            <form *ngIf="otpStep === 'phone'" [formGroup]="phoneForm" (ngSubmit)="onRequestOtp()">
              <div class="mb-3">
                <label class="form-label fw-medium small">{{ 'auth.phone' | translate }}</label>
                <input
                  type="tel"
                  class="form-control"
                  style="font-size:14px;"
                  formControlName="phone"
                  [placeholder]="'auth.phonePlaceholder' | translate"
                  autocomplete="tel"
                  [class.is-invalid]="phoneCtrl.touched && phoneCtrl.invalid">
                <small class="text-muted">{{ 'auth.phoneHint' | translate }}</small>
                <small class="text-danger d-block" *ngIf="phoneCtrl.touched && phoneCtrl.hasError('required')">
                  {{ 'auth.phoneRequired' | translate }}
                </small>
                <small class="text-danger d-block" *ngIf="phoneCtrl.touched && phoneCtrl.hasError('pattern')">
                  {{ 'auth.phoneInvalid' | translate }}
                </small>
              </div>

              <button type="submit" class="btn btn-primary w-100" [disabled]="loading || cooldown > 0">
                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                <span *ngIf="cooldown > 0">{{ 'auth.sendCodeCooldown' | translate }} ({{ cooldown }}s)</span>
                <span *ngIf="cooldown === 0 && !loading">{{ 'auth.sendCode' | translate }}</span>
              </button>
            </form>

            <!-- Step 2: OTP code entry -->
            <form *ngIf="otpStep === 'code'" [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()">
              <div class="text-center mb-3">
                <p class="small text-muted mb-1">{{ 'auth.otpSentTo' | translate }}</p>
                <strong>{{ phoneForm.value.phone }}</strong>
                <button type="button" class="btn btn-link btn-sm d-block mx-auto mt-1"
                        (click)="backToPhone()">
                  {{ 'auth.changePhone' | translate }}
                </button>
              </div>

              <div class="mb-3">
                <label class="form-label fw-medium small text-center d-block">{{ 'auth.enterCode' | translate }}</label>
                <div class="otp-inputs">
                  <input
                    *ngFor="let i of otpDigitIndices; let idx = index"
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="otp-digit form-control"
                    [id]="'otp-' + idx"
                    [value]="otpDigits[idx]"
                    (input)="onOtpInput($event, idx)"
                    (keydown)="onOtpKeydown($event, idx)"
                    (paste)="onOtpPaste($event)">
                </div>
              </div>

              <button type="submit" class="btn btn-primary w-100 mb-3"
                      [disabled]="loading || otpCode.length < 6">
                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                {{ 'auth.verifyCode' | translate }}
              </button>

              <!-- Resend section -->
              <div class="text-center">
                <span *ngIf="cooldown > 0" class="small text-muted">
                  {{ 'auth.resendIn' | translate }} {{ cooldown }}s
                </span>
                <button *ngIf="cooldown === 0" type="button"
                        class="btn btn-link btn-sm p-0"
                        [disabled]="loading"
                        (click)="onRequestOtp()">
                  {{ 'auth.resendCode' | translate }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnDestroy {
  activeTab: LoginTab = 'staff';
  otpStep: OtpStep = 'phone';

  loading = false;
  errorMessage = '';
  errorList: string[] = [];
  successMessage = '';

  cooldown = 0;
  private cooldownSub?: Subscription;

  otpDigits: string[] = ['', '', '', '', '', ''];
  otpDigitIndices = [0, 1, 2, 3, 4, 5];

  get otpCode(): string {
    return this.otpDigits.join('');
  }

  staffForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]]
  });

  // Empty form group so the OTP form is bound to FormGroupDirective.
  // Without this, (ngSubmit) doesn't fire and the browser does a native submit → page reload to /login.
  otpForm = this.fb.group({});

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnDestroy(): void {
    this.cooldownSub?.unsubscribe();
  }

  get staffEmail() { return this.staffForm.controls['email']; }
  get staffPassword() { return this.staffForm.controls['password']; }
  get phoneCtrl() { return this.phoneForm.controls['phone']; }

  switchTab(tab: LoginTab): void {
    this.activeTab = tab;
    this.clearMessages();
    this.otpStep = 'phone';
    this.otpDigits = ['', '', '', '', '', ''];
  }

  onStaffSubmit(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.clearMessages();

    const dto = { email: this.staffEmail.value!, password: this.staffPassword.value! };

    this.auth.login(dto).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          const staffRoles = ['Admin','SalesRep','WarehouseOperator','WarehouseManager','Procurement','Accountant','OpsManager'];
          const hasStaffRole = res.data?.roles?.some(r => staffRoles.includes(r));
          if (hasStaffRole) {
            this.router.navigate(['/admin/dashboard']);
          } else if (res.data?.roles?.includes('Customer')) {
            this.navigateAfterCustomerLogin();
          } else {
            this.router.navigate(['/forbidden']);
          }
        } else {
          this.errorMessage = res.message;
          this.errorList = res.errors ?? [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.message ?? 'Login failed.';
        this.errorList = err?.errors ?? [];
      }
    });
  }

  onRequestOtp(): void {
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.clearMessages();

    this.auth.otpRequest({ phone: this.phoneCtrl.value! }).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.otpStep = 'code';
          this.otpDigits = ['', '', '', '', '', ''];
          this.successMessage = '';
          this.startCooldown();
        } else {
          this.errorMessage = res.message;
          this.errorList = res.errors ?? [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.message ?? 'Failed to send OTP.';
        this.errorList = err?.errors ?? [];
        if (err?.statusCode === 429) {
          this.startCooldown();
        }
      }
    });
  }

  onVerifyOtp(): void {
    if (this.otpCode.length < 6) return;
    this.loading = true;
    this.clearMessages();

    this.auth.otpVerify({ phone: this.phoneCtrl.value!, code: this.otpCode }).subscribe({
      next: res => {
        this.loading = false;
        if (res.isSuccess) {
          this.navigateAfterCustomerLogin();
        } else {
          this.errorMessage = res.message;
          this.errorList = res.errors ?? [];
          this.otpDigits = ['', '', '', '', '', ''];
          setTimeout(() => {
            const first = document.getElementById('otp-0') as HTMLInputElement;
            first?.focus();
          }, 50);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.message ?? 'OTP verification failed.';
        this.errorList = err?.errors ?? [];
        this.otpDigits = ['', '', '', '', '', ''];
      }
    });
  }

  backToPhone(): void {
    this.otpStep = 'phone';
    this.otpDigits = ['', '', '', '', '', ''];
    this.clearMessages();
  }

  onOtpInput(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits = [...this.otpDigits];
    this.otpDigits[idx] = val;
    input.value = val;

    if (val && idx < 5) {
      const next = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement;
      next?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, idx: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[idx] && idx > 0) {
      const prev = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement;
      prev?.focus();
      this.otpDigits = [...this.otpDigits];
      this.otpDigits[idx - 1] = '';
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    this.otpDigits = [...this.otpDigits];
    digits.forEach((d, i) => { this.otpDigits[i] = d; });
    const lastFilled = Math.min(digits.length, 5);
    setTimeout(() => {
      const el = document.getElementById(`otp-${lastFilled}`) as HTMLInputElement;
      el?.focus();
    }, 10);
  }

  private startCooldown(): void {
    this.cooldown = 60;
    this.cooldownSub?.unsubscribe();
    this.cooldownSub = interval(1000)
      .pipe(takeWhile(() => this.cooldown > 0))
      .subscribe(() => { this.cooldown--; });
  }

  private navigateAfterCustomerLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/shop';
    this.router.navigateByUrl(returnUrl);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.errorList = [];
    this.successMessage = '';
  }
}
