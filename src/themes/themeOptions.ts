/**
 * Theme and chat-bubble appearance options shared by the store, App shell, and theme picker.
 * Keep option ids stable because both selections are persisted in local storage.
 */
export type ThemeType =
  | 'pastel' | 'gothic' | 'guofeng' | 'celtic-paladin' | 'status-terminal'
  | 'concept-20' | 'concept-33' | 'concept-57' | 'concept-58';
export type BubbleStyleType =
  | 'theme'
  | 'lunar-halo'
  | 'constellation-aurora'
  | 'rainbow-raincloud'
  | 'butterfly-flower-letter'
  | 'feather-wax-seal'
  | 'signal-terminal'
  | 'puzzle-alert'
  | 'black-wing-gaze'
  | 'sprinkle-bow'
  | 'chocolate-waffle'
  | 'celadon-koi'
  | 'library-card'
  | 'holographic-jelly'
  | 'neon-cassette'
  | 'snow-globe'
  | 'moss-specimen'
  | 'rose-window'
  | 'tidal-stamp';

export type BubbleStyleOption = {
  id: BubbleStyleType;
  name: string;
  desc: string;
  number?: string;
  preview: { surface: string; model: string; user: string; ink: string; userInk: string; accent: string };
};

export const themeOptions: Array<{ id: ThemeType; name: string; desc: string }> = [
  { id: 'pastel', name: '奶油手绘', desc: '粗描边、浅色块、正常手机桌面。' },
  { id: 'gothic', name: 'P5R 红黑', desc: '黑白高对比、鲜红斜切、利落手机桌面。' },
  { id: 'guofeng', name: '古风手札', desc: '宣纸米白、墨色文字、朱砂点印、黛青淡纹；像古籍手札里的现代小手机。' },
  { id: 'celtic-paladin', name: '凯尔特西幻', desc: '羊皮纸底、银蓝符文、深林绿和细金属边；像西幻手札里的现代手机。' },
  { id: 'status-terminal', name: '状态终端', desc: '磨砂玻璃、柔和蓝紫和信息卡片感，适合查看 AI 上下文与后台状态。' },
  { id: 'concept-20', name: '20 · 红幕剧场', desc: '黑红舞台、奶油纸片和戏剧化分区；图片区域由你自己上传。' },
  { id: 'concept-33', name: '33 · 像素咖啡', desc: '咖啡棕、羊皮纸与清晰像素格；图片区域由你自己上传。' },
  { id: 'concept-57', name: '57 · 层叠纸境', desc: '奶油纸、冷紫层次和一条红色路径；图片区域由你自己上传。' },
  { id: 'concept-58', name: '58 · 千禧浮窗', desc: '珍珠白、粉青窗口与紧凑桌面控件；图片区域由你自己上传。' },
];

const themeIds = new Set<ThemeType>(themeOptions.map((theme) => theme.id));

export function normalizeTheme(value: unknown): ThemeType {
  return typeof value === 'string' && themeIds.has(value as ThemeType) ? value as ThemeType : 'pastel';
}

const followThemePreview = { surface: '#f3efe8', model: '#fffdf8', user: '#78947f', ink: '#292b29', userInk: '#ffffff', accent: '#78947f' };

export const bubbleStyleOptions: BubbleStyleOption[] = [
  { id: 'theme', name: '跟随主题', desc: '继续使用当前整机主题自带的聊天气泡。', preview: followThemePreview },
  { id: 'lunar-halo', number: '01', name: '月相光环', desc: '象牙白与月夜紫，月相轨道和星芒收边。', preview: { surface: '#f4f0fa', model: '#f6f1e6', user: '#3a2f55', ink: '#514a78', userInk: '#fff9e8', accent: '#8e82c3' } },
  { id: 'constellation-aurora', number: '02', name: '星座流光', desc: '冰蓝星图与极光渐变，夜空玻璃质感。', preview: { surface: '#061a32', model: '#d7ecff', user: '#376f7b', ink: '#173d70', userInk: '#fff5dd', accent: '#ff9d95' } },
  { id: 'rainbow-raincloud', number: '03', name: '彩虹雨云', desc: '蓬松云朵、柔和彩虹与彩色雨滴。', preview: { surface: '#edf6ff', model: '#f8fbff', user: '#f7d6cd', ink: '#314d6d', userInk: '#30465d', accent: '#8bb9e8' } },
  { id: 'butterfly-flower-letter', number: '04', name: '蝶翼花信', desc: '水彩花叶、蝴蝶与暖米色纤维纸。', preview: { surface: '#f7f0e3', model: '#f7f1e4', user: '#a9ad8b', ink: '#4a4930', userInk: '#4a402d', accent: '#d9a78d' } },
  { id: 'feather-wax-seal', number: '05', name: '羽书火漆', desc: '旧纸、羽毛笔与酒红火漆印章。', preview: { surface: '#ebe1cd', model: '#f6eedc', user: '#7c2d2f', ink: '#31402f', userInk: '#fff4df', accent: '#7c2d2f' } },
  { id: 'signal-terminal', number: '06', name: '信号终端', desc: '窗口标题栏、钴蓝信号与青色进度线。', preview: { surface: '#eef3ff', model: '#e8eef8', user: '#0a3dff', ink: '#1e2a36', userInk: '#ffffff', accent: '#00d9ef' } },
  { id: 'puzzle-alert', number: '08', name: '拼图警戒', desc: '钴蓝拼图缺口、警戒黄与状态灯。', preview: { surface: '#f1f5fb', model: '#ffffff', user: '#073dca', ink: '#0b2f69', userInk: '#ffffff', accent: '#ffd200' } },
  { id: 'black-wing-gaze', number: '09', name: '黑翼凝视', desc: '黑白羽翼、紫瞳宝石与暗红微光。', preview: { surface: '#101116', model: '#f2efe9', user: '#19181b', ink: '#29242d', userInk: '#eee9e3', accent: '#8f82b4' } },
  { id: 'sprinkle-bow', number: '11', name: '糖粒蝴蝶结', desc: '糖纸扭结、彩色糖粒与草莓粉丝带。', preview: { surface: '#fff8f2', model: '#fffaf0', user: '#f8bfd0', ink: '#7f2944', userInk: '#7f2944', accent: '#f27a9d' } },
  { id: 'chocolate-waffle', number: '12', name: '巧克力华夫', desc: '华夫格压纹、巧克力淋面与焦糖描边。', preview: { surface: '#fff5df', model: '#fff0d4', user: '#4a1f12', ink: '#5a2e1c', userInk: '#fff2d4', accent: '#c87d3a' } },
  { id: 'celadon-koi', number: '13', name: '青瓷游鲤', desc: '青瓷开片、游鲤水波与朱砂点睛。', preview: { surface: '#f5f2e8', model: '#f7f5ec', user: '#8cb7ae', ink: '#345e59', userInk: '#234946', accent: '#c4432f' } },
  { id: 'library-card', number: '14', name: '复古借阅卡', desc: '索引卡横线、日期章与黄铜回形针。', preview: { surface: '#e9dfca', model: '#f4ead7', user: '#3f5738', ink: '#3d392d', userInk: '#f9f0dc', accent: '#8c3d35' } },
  { id: 'holographic-jelly', number: '15', name: '全息果冻', desc: '虹彩折射、透明软胶与星形闪片。', preview: { surface: '#f6f1ff', model: '#f1efff', user: '#f7d5ed', ink: '#544c83', userInk: '#544c83', accent: '#a998e6' } },
  { id: 'neon-cassette', number: '16', name: '磁带霓虹', desc: '深夜卡带、青蓝波形与洋红霓虹。', preview: { surface: '#08051a', model: '#071229', user: '#351039', ink: '#68ecff', userInk: '#ff82dc', accent: '#ff36ac' } },
  { id: 'snow-globe', number: '17', name: '雪夜玻璃球', desc: '雾面玻璃、松枝雪花与暖灯金。', preview: { surface: '#dce7f4', model: '#f5f3ec', user: '#173459', ink: '#455f80', userInk: '#fff8e7', accent: '#ffc261' } },
  { id: 'moss-specimen', number: '18', name: '苔藓标本', desc: '植物标本、玻璃载片与编号标签。', preview: { surface: '#eee8d8', model: '#f4edda', user: '#455630', ink: '#40552e', userInk: '#f8f0d9', accent: '#9a4937' } },
  { id: 'rose-window', number: '19', name: '玫瑰花窗', desc: '宝石玻璃、金属铅线与玫瑰窗几何。', preview: { surface: '#eee8df', model: '#f7f0e4', user: '#172853', ink: '#182850', userInk: '#fff4dc', accent: '#b28a31' } },
  { id: 'tidal-stamp', number: '20', name: '潮汐邮票', desc: '邮票齿孔、航海邮戳与海盐水彩。', preview: { surface: '#e6f2f3', model: '#f7f1e5', user: '#0d4772', ink: '#154d70', userInk: '#fff9ea', accent: '#f27a55' } },
];

const bubbleStyleIds = new Set<BubbleStyleType>(bubbleStyleOptions.map((option) => option.id));

export function normalizeBubbleStyle(value: unknown): BubbleStyleType {
  const legacyAliases: Record<string, BubbleStyleType> = {
    wechat: 'theme',
    qq: 'constellation-aurora',
    glass: 'holographic-jelly',
    scrapbook: 'butterfly-flower-letter',
    pixel: 'neon-cassette',
  };
  if (typeof value === 'string' && legacyAliases[value]) return legacyAliases[value];
  return bubbleStyleIds.has(value as BubbleStyleType) ? value as BubbleStyleType : 'theme';
}
