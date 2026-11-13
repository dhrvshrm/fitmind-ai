import { INDIA_FIRST_STRINGS } from '../constants/indiaFirstStrings';
import type { GroceryItem, GroceryList } from '../types/indiaFirst';

const G = INDIA_FIRST_STRINGS.grocery;

/** How much to buy, in household units ("1.5 kg", "6 pieces", "as needed"). */
export function amountText(item: GroceryItem): string {
  if (item.aisle === 'ready_made' && item.servings != null && item.serving_unit && item.grams != null) {
    return G.servings(item.servings, item.serving_unit, item.grams);
  }
  if (item.amount == null || !item.unit) return G.asNeeded;
  return G.units[item.unit](item.amount);
}

/** The list as plain text, aisle by aisle, for copying into a chat or notes app. */
export function groceryText(list: GroceryList): string {
  const lines = [G.printTitle, G.subtitle(list.days), ''];
  for (const group of list.aisles) {
    lines.push(G.aisles[group.aisle]);
    for (const item of group.items) lines.push(`- ${item.name}: ${amountText(item)}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Opens a plain, printable page of the list and the browser's print dialog. */
export function printGroceryList(list: GroceryList): boolean {
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return false;
  const sections = list.aisles
    .map(
      (group) =>
        `<h2>${escapeHtml(G.aisles[group.aisle])}</h2><ul>${group.items
          .map((item) => `<li><span class="box"></span>${escapeHtml(item.name)} <em>${escapeHtml(amountText(item))}</em></li>`)
          .join('')}</ul>`,
    )
    .join('');
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(G.printTitle)}</title><style>` +
      'body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin:0 0 4px}' +
      'p{margin:0 0 20px;color:#555}h2{font-size:15px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em}' +
      'ul{list-style:none;padding:0;margin:0}li{padding:5px 0;border-bottom:1px solid #eee}em{color:#555;font-style:normal;margin-left:6px}' +
      '.box{display:inline-block;width:12px;height:12px;border:1.5px solid #333;border-radius:3px;margin-right:10px;vertical-align:-1px}' +
      `</style></head><body><h1>${escapeHtml(G.printTitle)}</h1><p>${escapeHtml(G.subtitle(list.days))}</p>${sections}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  return true;
}
