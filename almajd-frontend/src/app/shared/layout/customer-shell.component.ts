import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../features/shop/services/cart.service';
import { ShopApiService, CategoryNode } from '../../features/shop/services/shop-api.service';

@Component({
  selector: 'app-customer-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ReactiveFormsModule, TranslateModule],
  styles: [`
    .customer-topbar {
      background-color: var(--bg-elev);
      border-bottom: 1px solid var(--border);
      padding: 0 1rem;
      height: 60px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: sticky;
      top: 0;
      z-index: 1030;
    }
    .brand-mark {
      width: 38px;
      height: 38px;
      background-color: var(--primary);
      color: #fff;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1.25rem;
      text-decoration: none;
      flex-shrink: 0;
    }
    .search-box {
      flex: 1;
      max-width: 480px;
    }
    .cart-btn {
      position: relative;
      min-width: 44px;
      min-height: 44px;
    }
    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background-color: var(--danger);
      color: #fff;
      border-radius: 50%;
      min-width: 18px;
      height: 18px;
      font-size: 0.7rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }
    .customer-footer {
      background-color: var(--bg-elev);
      border-top: 1px solid var(--border);
      padding: 1rem 1.5rem;
      font-size: 0.85rem;
      color: var(--fg-muted);
    }
    .mobile-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1040;
    }
    .mobile-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background: var(--bg-elev);
      z-index: 1050;
      padding: 1.25rem 1rem;
      overflow-y: auto;
      border-right: 1px solid var(--border);
    }
    [dir="rtl"] .mobile-drawer {
      left: auto;
      right: 0;
      border-right: none;
      border-left: 1px solid var(--border);
    }
    .page-content {
      min-height: calc(100vh - 120px);
      padding: 1.5rem;
    }
    @media (max-width: 576px) {
      .page-content { padding: 1rem 0.75rem; }
      .search-box { max-width: 100%; }
    }
    .category-dropdown-menu {
      min-width: 220px;
    }
    .nav-link-customer {
      color: var(--fg);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.9rem;
      white-space: nowrap;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .nav-link-customer:hover {
      background-color: var(--primary-soft);
      color: var(--primary);
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
  `],
  template: `
    <!-- Mobile drawer backdrop -->
    <div class="mobile-drawer-backdrop d-md-none"
         *ngIf="drawerOpen"
         (click)="drawerOpen = false"></div>

    <!-- Mobile drawer -->
    <div class="mobile-drawer d-md-none" *ngIf="drawerOpen">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="fw-bold" style="color: var(--primary);">{{ 'app.customerTitle' | translate }}</span>
        <button class="btn btn-sm btn-outline-secondary" (click)="drawerOpen = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="d-flex flex-column gap-1">
        <a routerLink="/shop" class="nav-link-customer" (click)="drawerOpen = false">
          <i class="fas fa-home me-2"></i>{{ 'shop.home' | translate }}
        </a>
        <div *ngIf="categories.length">
          <div class="fw-semibold small text-muted px-2 mb-1">{{ 'shop.categories' | translate }}</div>
          <a *ngFor="let cat of categories"
             [routerLink]="['/shop/category', cat.slug]"
             class="nav-link-customer d-block"
             (click)="drawerOpen = false">
            {{ cat.name }}
          </a>
        </div>
        <ng-container *ngIf="isLoggedIn; else mobileSignIn">
          <a routerLink="/my-orders" class="nav-link-customer" (click)="drawerOpen = false">
            <i class="fas fa-box me-2"></i>{{ 'shop.myOrders' | translate }}
          </a>
          <a routerLink="/account/profile" class="nav-link-customer" (click)="drawerOpen = false">
            <i class="fas fa-user me-2"></i>{{ 'shop.myProfile' | translate }}
          </a>
          <a routerLink="/account/addresses" class="nav-link-customer" (click)="drawerOpen = false">
            <i class="fas fa-map-marker-alt me-2"></i>{{ 'shop.myAddresses' | translate }}
          </a>
          <a routerLink="/account/statements" class="nav-link-customer" (click)="drawerOpen = false">
            <i class="fas fa-file-invoice me-2"></i>{{ 'shop.statements' | translate }}
          </a>
          <a routerLink="/account/notifications" class="nav-link-customer" (click)="drawerOpen = false">
            <i class="fas fa-bell me-2"></i>{{ 'shop.notifications' | translate }}
          </a>
          <button class="btn btn-outline-danger btn-sm mt-2" (click)="logout()">
            <i class="fas fa-right-from-bracket me-1"></i>{{ 'auth.logout' | translate }}
          </button>
        </ng-container>
        <ng-template #mobileSignIn>
          <a routerLink="/login" class="btn btn-primary btn-sm mt-2" (click)="drawerOpen = false">
            {{ 'auth.signIn' | translate }}
          </a>
        </ng-template>
      </div>
    </div>

    <!-- Top navigation bar -->
    <header class="customer-topbar">
      <!-- Hamburger (mobile) -->
      <button class="btn btn-sm btn-outline-secondary d-md-none"
              style="min-width:44px;min-height:44px;"
              (click)="drawerOpen = !drawerOpen">
        <i class="fas fa-bars"></i>
      </button>

      <!-- Logo -->
      <a routerLink="/shop" class="brand-mark text-decoration-none">A</a>

      <!-- Category dropdown (desktop) -->
      <div class="dropdown d-none d-md-block">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style="min-height:38px;">
          {{ 'shop.categories' | translate }}
        </button>
        <ul class="dropdown-menu category-dropdown-menu">
          <li *ngFor="let cat of categories">
            <a class="dropdown-item" [routerLink]="['/shop/category', cat.slug]">
              {{ cat.name }}
            </a>
            <ul class="list-unstyled ps-3" *ngIf="cat.children && cat.children.length">
              <li *ngFor="let child of cat.children">
                <a class="dropdown-item small text-muted" [routerLink]="['/shop/category', child.slug]">
                  {{ child.name }}
                </a>
              </li>
            </ul>
          </li>
          <li *ngIf="!categories.length">
            <span class="dropdown-item text-muted">{{ 'common.loading' | translate }}</span>
          </li>
        </ul>
      </div>

      <!-- Search box -->
      <div class="search-box d-none d-sm-block">
        <div class="input-group input-group-sm">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
          <input
            type="search"
            class="form-control"
            style="font-size: 14px;"
            [placeholder]="'shop.searchPlaceholder' | translate"
            [formControl]="searchCtrl">
        </div>
      </div>

      <!-- Right side -->
      <div class="d-flex align-items-center gap-2 ms-auto">
        <!-- My Orders link (desktop) -->
        <a routerLink="/my-orders" class="nav-link-customer d-none d-md-flex" *ngIf="isLoggedIn">
          <i class="fas fa-box me-1"></i>{{ 'shop.myOrders' | translate }}
        </a>

        <!-- Cart -->
        <a routerLink="/shop/cart" class="btn btn-outline-secondary btn-sm cart-btn">
          <i class="fas fa-shopping-cart"></i>
          <span class="cart-badge" *ngIf="(cartCount$ | async) as cnt">{{ cnt }}</span>
        </a>

        <!-- User dropdown (logged in) -->
        <div class="dropdown" *ngIf="isLoggedIn; else signInBtn">
          <div class="avatar" data-bs-toggle="dropdown" aria-expanded="false">
            {{ userInitials }}
          </div>
          <ul class="dropdown-menu dropdown-menu-end" style="min-width:200px;">
            <li>
              <span class="dropdown-item-text fw-semibold small">{{ currentUser?.fullName || currentUser?.email }}</span>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" routerLink="/account/profile">
              <i class="fas fa-user me-2"></i>{{ 'shop.myProfile' | translate }}
            </a></li>
            <li><a class="dropdown-item" routerLink="/account/addresses">
              <i class="fas fa-map-marker-alt me-2"></i>{{ 'shop.myAddresses' | translate }}
            </a></li>
            <li><a class="dropdown-item" routerLink="/account/statements">
              <i class="fas fa-file-invoice me-2"></i>{{ 'shop.statements' | translate }}
            </a></li>
            <li><a class="dropdown-item" routerLink="/account/notifications">
              <i class="fas fa-bell me-2"></i>{{ 'shop.notifications' | translate }}
            </a></li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <button class="dropdown-item text-danger" (click)="logout()">
                <i class="fas fa-right-from-bracket me-2"></i>{{ 'auth.logout' | translate }}
              </button>
            </li>
          </ul>
        </div>
        <ng-template #signInBtn>
          <a routerLink="/login" class="btn btn-primary btn-sm d-none d-md-inline-flex align-items-center">
            {{ 'auth.signIn' | translate }}
          </a>
        </ng-template>

        <!-- Language switcher -->
        <div class="d-none d-md-flex gap-1">
          <button class="btn btn-sm"
                  [class.btn-primary]="currentLang === 'en'"
                  [class.btn-outline-secondary]="currentLang !== 'en'"
                  (click)="setLang('en')">EN</button>
          <button class="btn btn-sm"
                  [class.btn-primary]="currentLang === 'ar'"
                  [class.btn-outline-secondary]="currentLang !== 'ar'"
                  (click)="setLang('ar')">AR</button>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="page-content">
      <router-outlet></router-outlet>
    </main>

    <!-- Footer -->
    <footer class="customer-footer d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>&copy; {{ currentYear }} {{ 'app.customerTitle' | translate }}. {{ 'shop.allRightsReserved' | translate }}</span>
      <div class="d-flex gap-1">
        <button class="btn btn-sm"
                [class.btn-link]="currentLang !== 'en'"
                [class.btn-primary]="currentLang === 'en'"
                (click)="setLang('en')">EN</button>
        <button class="btn btn-sm"
                [class.btn-link]="currentLang !== 'ar'"
                [class.btn-primary]="currentLang === 'ar'"
                (click)="setLang('ar')">AR</button>
      </div>
    </footer>
  `
})
export class CustomerShellComponent implements OnInit, OnDestroy {
  drawerOpen = false;
  categories: CategoryNode[] = [];
  currentLang = 'en';
  currentYear = new Date().getFullYear();
  searchCtrl = new FormControl('');

  cartCount$ = this.cartService.count$;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private shopApi: ShopApiService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? 'en';

    this.shopApi.getCategoryTree().subscribe(res => {
      if (res.isSuccess && res.data) {
        this.categories = res.data;
      }
    });

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (term && term.trim().length >= 2) {
        this.router.navigate(['/shop'], { queryParams: { search: term.trim() } });
      } else if (!term || term.trim().length === 0) {
        this.router.navigate(['/shop']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  get currentUser() {
    return this.authService.currentUser;
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName ?? this.currentUser?.email ?? '?';
    return name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
