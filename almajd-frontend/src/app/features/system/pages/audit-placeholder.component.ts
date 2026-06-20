import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-audit-placeholder',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page-header">
      <h2>{{ 'system.audit.title' | translate }}</h2>
    </div>
    <div class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <i class="fas fa-clock-rotate-left fa-3x text-muted mb-3"></i>
        <p class="text-muted mb-0">{{ 'system.audit.placeholder' | translate }}</p>
      </div>
    </div>
  `
})
export class AuditPlaceholderComponent {}
