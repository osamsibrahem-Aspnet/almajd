import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center" style="background-color: var(--bg);">
      <div class="text-center">
        <div class="mb-4">
          <i class="fas fa-lock fa-4x" style="color: var(--danger); opacity: 0.6;"></i>
        </div>
        <h1 class="display-6 fw-bold mb-2" style="color: var(--fg);">403</h1>
        <h2 class="h4 mb-3" style="color: var(--fg);">{{ 'forbidden.title' | translate }}</h2>
        <p class="text-muted mb-4">{{ 'forbidden.message' | translate }}</p>
        <a routerLink="/admin/dashboard" class="btn btn-primary">
          <i class="fas fa-arrow-left me-2"></i>
          {{ 'forbidden.back' | translate }}
        </a>
      </div>
    </div>
  `
})
export class ForbiddenComponent {}
