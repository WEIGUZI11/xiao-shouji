export type ThemeType = 'pastel' | 'gothic' | 'guofeng' | 'celtic-paladin' | 'status-terminal' | 'alcheris-pixel';

export const themeOptions: Array<{ id: ThemeType; name: string; desc: string }> = [
  { id: 'pastel', name: '奶油手绘', desc: '粗描边、浅色块、正常手机桌面。' },
  { id: 'gothic', name: 'P5R 红黑', desc: '黑白高对比、鲜红斜切、利落手机桌面。' },
  { id: 'guofeng', name: '古风手札', desc: '宣纸米白、墨色文字、朱砂点印、黛青淡纹；像古籍手札里的现代小手机。' },
  { id: 'celtic-paladin', name: '凯尔特西幻', desc: '羊皮纸底、银蓝符文、深林绿和细金属边；像西幻手札里的现代手机。' },
  { id: 'status-terminal', name: '状态终端', desc: '磨砂玻璃、柔和蓝紫和信息卡片感，适合查看 AI 上下文与后台状态。' },
  { id: 'alcheris-pixel', name: '阿尔切利斯像素', desc: '黑紫像素终端、等宽字体、硬边状态栏和轻微扫描动态。' },
];
