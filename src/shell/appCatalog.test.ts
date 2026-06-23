import { dockApps, getAllCatalogScreens, pageApps } from './appCatalog';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const allScreens = getAllCatalogScreens();
const uniqueScreens = new Set(allScreens);
const pageIds = new Set(pageApps.map((app) => app.id));
const pageScreens = new Set(pageApps.map((app) => app.screen));

assert(pageApps.length === 18, `expected 18 desktop apps, got ${pageApps.length}`);
assert(dockApps.length === 4, `expected 4 dock apps, got ${dockApps.length}`);
assert(uniqueScreens.size === allScreens.length, 'catalog screens must be unique across desktop and dock');
assert(pageIds.size === pageApps.length, 'desktop app ids must be unique');
assert(pageScreens.has('wechat'), 'desktop catalog must include WeChat');
assert(pageScreens.has('xiaohongshu'), 'desktop catalog must include Xiaohongshu');
assert(pageScreens.has('bilibili'), 'desktop catalog must include Bilibili');
assert(pageScreens.has('char-active'), 'desktop catalog must include manual active events');
assert(pageScreens.has('backup'), 'desktop catalog must include data backup');
assert(pageScreens.has('user-info'), 'desktop catalog must include user info');
assert(pageApps.filter((app) => app.page === 0).length === 7, 'page 0 desktop app count changed');
assert(pageApps.filter((app) => app.page === 1).length === 11, 'page 1 desktop app count changed');
assert(dockApps.map((app) => app.screen).join(',') === 'phone,settings,contacts,themes', 'dock app order changed');

console.log('app catalog ok');
