import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface CartItem {
  skuId: string;
  skuCode: string;
  productName: string;
  attributes: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
}

const CART_KEY = 'almajd.cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items$ = new BehaviorSubject<CartItem[]>(this.load());

  items$ = this._items$.asObservable();

  count$ = this._items$.pipe(
    map(items => items.reduce((sum, i) => sum + i.qty, 0))
  );

  subTotal$ = this._items$.pipe(
    map(items => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0))
  );

  get items(): CartItem[] {
    return this._items$.value;
  }

  add(item: CartItem): void {
    const current = this._items$.value;
    const idx = current.findIndex(i => i.skuId === item.skuId);
    let updated: CartItem[];
    if (idx >= 0) {
      updated = current.map((ci, i) =>
        i === idx ? { ...ci, qty: ci.qty + item.qty } : ci
      );
    } else {
      updated = [...current, item];
    }
    this.save(updated);
  }

  update(skuId: string, qty: number): void {
    if (qty <= 0) {
      this.remove(skuId);
      return;
    }
    const updated = this._items$.value.map(i =>
      i.skuId === skuId ? { ...i, qty } : i
    );
    this.save(updated);
  }

  remove(skuId: string): void {
    const updated = this._items$.value.filter(i => i.skuId !== skuId);
    this.save(updated);
  }

  clear(): void {
    this.save([]);
  }

  restore(items: CartItem[]): void {
    this.save(items);
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this._items$.next(items);
  }
}
