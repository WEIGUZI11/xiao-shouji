import {
  ChevronLeft,
  ChevronRight,
  Check,
  CircleUserRound,
  FileText,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  ImagePlus,
  LockKeyhole,
  MessageCircle,
  Plus,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { GalleryPhoto } from '../../store';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import {
  buildGalleryHiddenUpdate,
  buildGalleryPhotoDraft,
  buildGalleryReviewContent,
  filterGalleryPhotos,
  galleryAlbums,
  gallerySources,
  groupGalleryPhotosByDate,
  normalizeGalleryTag,
  toggleGalleryTag,
  type GalleryAlbumFilter,
  type GalleryTab,
  type GalleryView,
  type GalleryPhotoSource,
} from './galleryLogic';

function Header({
  title,
  subtitle,
  tabs,
  onSave,
  onBack,
  saveLabel = '保存',
}: {
  title: string;
  subtitle?: string;
  tabs?: React.ReactNode;
  onSave?: () => void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const goBack = useAppStore((state) => state.goBack);
  return (
    <header className="sticky top-0 z-30 bg-[var(--phone-bg)] px-4 pb-4 pt-6">
      <div className="grid grid-cols-[48px_1fr_56px] items-center">
        <button onClick={onBack || goBack} className="circle-button" aria-label="返回">
          <ChevronLeft className="h-7 w-7" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold opacity-60">{subtitle}</p>}
        </div>
        {onSave ? <button onClick={onSave} className="save-button">{saveLabel}</button> : <span />}
      </div>
      {tabs && <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">{tabs}</div>}
    </header>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hand-panel mx-4 mb-4 p-4', className)}>{children}</div>;
}

type PillProps = { active?: boolean; icon?: React.ReactNode; label: string; onClick: () => void };

const Pill: React.FC<PillProps> = ({ active, icon, label, onClick }) => {
  return (
    <button onClick={onClick} className={cn('pill', active && 'active')}>
      {icon && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
};

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 flex items-center gap-2 text-lg font-black">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
        {label}
      </span>
      {children}
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white/60 p-4 text-center text-sm font-black opacity-60">{text}</p>;
}

type EntryCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number;
  preview?: string;
  onClick: () => void;
};

const EntryCard: React.FC<EntryCardProps> = ({
  icon,
  title,
  subtitle,
  count,
  preview,
  onClick,
}) => {
  return (
    <button onClick={onClick} className="gallery-entry-card">
      <div className="gallery-entry-icon">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 opacity-60">{subtitle}</p>
      </div>
      {preview ? <img src={preview} alt="" className="gallery-entry-preview" /> : <span className="text-sm font-black opacity-55">{count ?? 0}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 opacity-55" />
    </button>
  );
};

function formatDateLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

type GalleryCollection = {
  title: string;
  subtitle: string;
  tab: GalleryTab;
  albumFilter: GalleryAlbumFilter;
  sourceFilter?: GalleryPhotoSource;
};

function sourceLabel(source?: GalleryPhotoSource) {
  return gallerySources.find((item) => item.source === source)?.label || '其它来源';
}

export function GalleryScreen() {
  const {
    galleryPhotos,
    galleryTags,
    imageBed,
    wechatPhotos,
    wallpaper,
    addGalleryPhoto,
    updateGalleryPhoto,
    addGalleryPhotoReview,
    deleteGalleryPhoto,
    toggleGalleryPhotoFavorite,
    setWallpaper,
    addGalleryTag,
    characters,
  } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<GalleryView>('home');
  const [collection, setCollection] = useState<GalleryCollection>({
    title: '全部照片',
    subtitle: '按时间整理所有可见照片',
    tab: 'all',
    albumFilter: '全部',
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState('');
  const [newTag, setNewTag] = useState('');
  const [uploadAlbum, setUploadAlbum] = useState<GalleryPhoto['album']>('生活');
  const [uploadTag, setUploadTag] = useState('日常');
  const [status, setStatus] = useState('');
  const activePhoto = galleryPhotos.find((photo) => photo.id === activeId);
  const visiblePhotos = filterGalleryPhotos(galleryPhotos, { tab: collection.tab, albumFilter: collection.albumFilter })
    .filter((photo) => !collection.sourceFilter || photo.source === collection.sourceFilter);
  const groupedPhotos = groupGalleryPhotosByDate(visiblePhotos, formatDateLabel);
  const visibleAllCount = filterGalleryPhotos(galleryPhotos, { tab: 'all', albumFilter: '全部' }).length;
  const sortedPhotos = [...galleryPhotos].sort((a, b) => b.createdAt - a.createdAt);
  const countPhotos = (predicate: (photo: GalleryPhoto) => boolean) => galleryPhotos.filter(predicate).length;
  const previewPhoto = (predicate: (photo: GalleryPhoto) => boolean) => sortedPhotos.find(predicate)?.url;

  const openCollection = (next: GalleryCollection) => {
    setCollection(next);
    setView('collection');
  };

  const addPhotoUrl = (
    url: string,
    source: GalleryPhotoSource,
    title = '新照片',
    createdAt = Date.now(),
    options: { openDetail?: boolean; album?: GalleryPhoto['album']; tags?: string[] } = {},
  ) => {
    const draft = buildGalleryPhotoDraft({ url, source, title, createdAt });
    const id = addGalleryPhoto({
      ...draft,
      album: options.album || draft.album,
      hidden: options.album === '隐藏' ? true : draft.hidden,
      tags: Array.from(new Set([...(draft.tags || []), ...(options.tags || []).map(normalizeGalleryTag).filter(Boolean)])),
    });
    if (options.openDetail !== false) {
      setActiveId(id);
      setView('detail');
    }
    return id;
  };

  const uploadPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(event.target.files || []);
    const tag = normalizeGalleryTag(uploadTag);
    if (tag) addGalleryTag(tag);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => addPhotoUrl(reader.result as string, 'upload', file.name.replace(/\.[^.]+$/, '') || '新照片', file.lastModified || Date.now(), {
        openDetail: false,
        album: uploadAlbum,
        tags: tag ? [tag] : [],
      });
      reader.readAsDataURL(file);
    });
    if (files.length > 0) {
      setStatus(`已加入 ${files.length} 张照片：${uploadAlbum}${tag ? ` · ${tag}` : ''}`);
      openCollection({ title: uploadAlbum, subtitle: `${uploadAlbum}相簿`, tab: uploadAlbum === '隐藏' ? 'hidden' : 'all', albumFilter: uploadAlbum });
    }
    event.target.value = '';
  };

  const importWechatPhoto = (url: string) => {
    const existing = galleryPhotos.find((photo) => photo.url === url);
    if (existing) {
      setActiveId(existing.id);
      setView('detail');
      return;
    }
    addPhotoUrl(url, 'wechat', '微信照片');
  };

  const generatePhotoReview = () => {
    if (!activePhoto) return;
    const character = characters.find((item) => item.id === activePhoto.characterId) || characters[0];
    addGalleryPhotoReview(activePhoto.id, {
      characterId: character?.id,
      content: buildGalleryReviewContent({ photo: activePhoto, character, draft: reviewDraft }),
    });
    setReviewDraft('');
  };

  const togglePhotoTag = (tag: string) => {
    if (!activePhoto) return;
    updateGalleryPhoto(activePhoto.id, { tags: toggleGalleryTag(activePhoto.tags, tag) });
  };

  const createGalleryTag = () => {
    const tag = normalizeGalleryTag(newTag);
    if (!tag) return;
    addGalleryTag(tag);
    if (activePhoto && !activePhoto.tags.includes(tag)) {
      updateGalleryPhoto(activePhoto.id, { tags: [...activePhoto.tags, tag] });
    }
    setNewTag('');
  };

  const photoGrid = visiblePhotos.length > 0 ? (
    <div className="grid gap-4">
      {groupedPhotos.map((group) => (
        <div key={group.day}>
          <p className="mb-2 text-sm font-black opacity-60">{group.day}</p>
          <div className="grid grid-cols-3 gap-2">
            {group.photos.map((photo) => (
              <button key={photo.id} onClick={() => { setActiveId(photo.id); setView('detail'); }} className="relative aspect-square overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-white">
                <img src={photo.url} alt={photo.title} className="h-full w-full object-cover" />
                {photo.favorite && <Star className="absolute right-1 top-1 h-4 w-4 fill-[#fff0b8] text-[#111]" />}
                {photo.hidden && <LockKeyhole className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#111]" />}
                {photo.readableByChar && <MessageCircle className="absolute bottom-1 left-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#111]" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty text="这里还没有照片。" />
  );

  if (view === 'detail' && activePhoto) {
    return (
      <section className="gallery-screen h-full overflow-y-auto pb-8">
        <Header title="照片" subtitle={`${formatDateLabel(activePhoto.createdAt)} · ${activePhoto.album} · ${sourceLabel(activePhoto.source)}`} onBack={() => setView('collection')} />
        <Panel className="overflow-hidden p-0">
          <img src={activePhoto.url} alt={activePhoto.title} className="max-h-[430px] w-full object-cover" />
        </Panel>
        <Panel>
          <Field icon={<ImageIcon />} label="标题">
            <input value={activePhoto.title} onChange={(event) => updateGalleryPhoto(activePhoto.id, { title: event.target.value })} className="hand-input w-full" />
          </Field>
          <Field icon={<Grid2X2 />} label="相簿">
            <select value={activePhoto.album} onChange={(event) => updateGalleryPhoto(activePhoto.id, { album: event.target.value as GalleryPhoto['album'], hidden: event.target.value === '隐藏' })} className="hand-input w-full">
              {galleryAlbums.map((album) => <option key={album} value={album}>{album}</option>)}
            </select>
          </Field>
          <div className="mb-5">
            <span className="mb-2 flex items-center gap-2 text-lg font-black">
              <Tag className="h-5 w-5" />
              标签
            </span>
            <div className="flex flex-wrap gap-2">
              {galleryTags.map((tag) => (
                <button key={tag} onClick={() => togglePhotoTag(tag)} className={cn('pill', activePhoto.tags.includes(tag) && 'active')}>
                  {tag}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createGalleryTag()} className="hand-input min-w-0 flex-1" placeholder="新标签" />
              <button onClick={createGalleryTag} className="pill active">
                <Plus className="h-4 w-4" />
                创建
              </button>
            </div>
          </div>
          <Field icon={<CircleUserRound />} label="给谁看">
            <select value={activePhoto.characterId || ''} onChange={(event) => updateGalleryPhoto(activePhoto.id, { characterId: event.target.value })} className="hand-input w-full">
              <option value="">所有 char</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<FileText />} label="备注">
            <textarea value={activePhoto.description || ''} onChange={(event) => updateGalleryPhoto(activePhoto.id, { description: event.target.value })} className="hand-input min-h-[72px] w-full resize-none" placeholder="可选，补一句照片说明" />
          </Field>
          <Field icon={<MessageCircle />} label="评价提示">
            <textarea value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} className="hand-input min-h-[76px] w-full resize-none" placeholder="可选：想让 char 从什么角度评价" />
          </Field>
          <button onClick={generatePhotoReview} className="fetch-button mb-4">
            <MessageCircle className="h-5 w-5" />
            让 char 评价这张照片
          </button>
          {(activePhoto.reviews || []).length > 0 && (
            <div className="mb-4 rounded-2xl bg-white/70 p-3">
              <p className="text-sm font-black opacity-60">char 评价</p>
              {(activePhoto.reviews || []).map((review) => {
                const character = characters.find((item) => item.id === review.characterId);
                return (
                  <p key={`${review.createdAt}-${review.content}`} className="mt-2 text-sm font-bold leading-6">
                    {character ? `${character.name}：` : ''}{review.content}
                  </p>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setWallpaper(activePhoto.url)} className={cn('fetch-button', wallpaper === activePhoto.url && 'bg-[#dceecd]')}>
              <ImageIcon className="h-5 w-5" />
              <span>{wallpaper === activePhoto.url ? '当前锁屏' : '设为锁屏'}</span>
            </button>
            <button onClick={() => setWallpaper(null)} className="fetch-button">
              <LockKeyhole className="h-5 w-5" />
              <span>默认锁屏</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <button onClick={() => toggleGalleryPhotoFavorite(activePhoto.id)} className={cn('fetch-button', activePhoto.favorite && 'bg-[#fff0b8]')}>
              <Star className={cn('h-5 w-5', activePhoto.favorite && 'fill-[#111]')} />
            </button>
            <button onClick={() => updateGalleryPhoto(activePhoto.id, { readableByChar: !activePhoto.readableByChar })} className={cn('fetch-button', activePhoto.readableByChar && 'bg-[#dceecd]')}>
              <CircleUserRound className="h-5 w-5" />
            </button>
            <button onClick={() => updateGalleryPhoto(activePhoto.id, buildGalleryHiddenUpdate(activePhoto))} className="fetch-button">
              <LockKeyhole className="h-5 w-5" />
            </button>
          </div>
          <button onClick={() => { deleteGalleryPhoto(activePhoto.id); setActiveId(null); setView('collection'); }} className="fetch-button mt-3 bg-[#ffd6d6]">
            <Trash2 className="h-5 w-5" />
          </button>
        </Panel>
      </section>
    );
  }

  if (view === 'collection') {
    return (
      <section className="gallery-screen h-full overflow-y-auto pb-8">
        <Header title={collection.title} subtitle={`${visiblePhotos.length} 张 · ${collection.subtitle}`} onBack={() => setView('home')} onSave={() => inputRef.current?.click()} saveLabel="上传" />
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
        <Panel className="p-4">{photoGrid}</Panel>
      </section>
    );
  }

  if (view === 'imports') {
    return (
      <section className="gallery-screen h-full overflow-y-auto pb-8">
        <Header title="导入照片" subtitle="从其它软件同步进相册" onBack={() => setView('home')} onSave={() => inputRef.current?.click()} saveLabel="上传" />
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
        <Panel>
          {imageBed ? (
            <button onClick={() => addPhotoUrl(imageBed, 'image-bed', '图床照片')} className="gallery-import-row">
              <img src={imageBed} alt="图床照片" className="h-16 w-16 rounded-2xl object-cover" />
              <span className="min-w-0 flex-1 text-sm font-black">导入图床照片，之后可设锁屏、给 char 看或给其它软件选用。</span>
              <ChevronRight className="h-5 w-5 opacity-55" />
            </button>
          ) : (
            <Empty text="图床还没有可导入的照片。" />
          )}
          {wechatPhotos.slice(0, 12).map((url) => (
            <button key={url} onClick={() => importWechatPhoto(url)} className="gallery-import-row mt-3">
              <img src={url} alt="微信照片" className="h-16 w-16 rounded-2xl object-cover" />
              <span className="min-w-0 flex-1 text-sm font-black">导入微信照片墙，导入后会进入“聊天/微信照片墙”来源。</span>
              <ChevronRight className="h-5 w-5 opacity-55" />
            </button>
          ))}
          {!imageBed && wechatPhotos.length === 0 && <p className="mt-3 text-center text-sm font-black opacity-55">暂时没有来自微信或图床的图片。</p>}
        </Panel>
      </section>
    );
  }

  return (
    <section className="gallery-screen h-full overflow-y-auto pb-8">
      <Header title="相册" subtitle="每个入口都会打开独立页面" onSave={() => inputRef.current?.click()} saveLabel="上传" />
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
      <Panel>
        <p className="mb-3 text-lg font-black">导入到相册</p>
        <div className="grid grid-cols-2 gap-3">
          <Field icon={<FolderOpen />} label="相簿">
            <select value={uploadAlbum} onChange={(event) => setUploadAlbum(event.target.value as GalleryPhoto['album'])} className="hand-input w-full">
              {galleryAlbums.map((album) => <option key={album} value={album}>{album}</option>)}
            </select>
          </Field>
          <Field icon={<Tag />} label="标签">
            <input value={uploadTag} onChange={(event) => setUploadTag(event.target.value)} className="hand-input w-full" placeholder="例如：旅行" />
          </Field>
        </div>
        <button onClick={() => inputRef.current?.click()} className="fetch-button mt-3">
          <ImagePlus className="h-5 w-5" />
          选择照片
        </button>
        {status && <p className="mt-3 flex items-center gap-2 text-sm font-black opacity-70"><Check className="h-4 w-4" />{status}</p>}
        <p className="mt-3 text-sm font-bold leading-6 opacity-65">上传只做一件事：选相簿、写一个标签、加入照片库。要改锁屏、给 char 看或写备注时，再点进单张照片。</p>
      </Panel>
      <Panel>
        <p className="mb-3 text-lg font-black">快速入口</p>
        <div className="grid gap-3">
          <EntryCard icon={<ImageIcon />} title="全部照片" subtitle="不包含隐藏照片，适合日常整理。" count={visibleAllCount} preview={previewPhoto((photo) => !photo.hidden)} onClick={() => openCollection({ title: '全部照片', subtitle: '按时间整理所有可见照片', tab: 'all', albumFilter: '全部' })} />
          <EntryCard icon={<Star />} title="收藏" subtitle="被标星的照片会集中在这里。" count={countPhotos((photo) => Boolean(photo.favorite))} preview={previewPhoto((photo) => Boolean(photo.favorite))} onClick={() => openCollection({ title: '收藏', subtitle: '所有已收藏照片', tab: 'favorites', albumFilter: '全部' })} />
          <EntryCard icon={<LockKeyhole />} title="隐藏" subtitle="隐藏照片默认不会给 char 读取。" count={countPhotos((photo) => Boolean(photo.hidden) || photo.album === '隐藏')} preview={previewPhoto((photo) => Boolean(photo.hidden) || photo.album === '隐藏')} onClick={() => openCollection({ title: '隐藏', subtitle: '隐藏相册内容', tab: 'hidden', albumFilter: '全部' })} />
          <EntryCard icon={<MessageCircle />} title="微信与聊天" subtitle="微信照片墙和聊天生图统一入口。" count={countPhotos((photo) => photo.source === 'wechat' || photo.source === 'chat' || photo.album === '聊天')} preview={previewPhoto((photo) => photo.source === 'wechat' || photo.source === 'chat' || photo.album === '聊天')} onClick={() => openCollection({ title: '微信与聊天', subtitle: '来自微信照片墙和聊天图片', tab: 'wechat', albumFilter: '全部' })} />
          <EntryCard icon={<ImagePlus />} title="导入区" subtitle="从图床、微信照片墙同步照片。" count={(imageBed ? 1 : 0) + wechatPhotos.length} preview={imageBed || wechatPhotos[0]} onClick={() => setView('imports')} />
        </div>
      </Panel>
      <Panel>
        <p className="mb-3 text-lg font-black">相簿</p>
        <div className="grid gap-3">
          {galleryAlbums.map((album) => {
            const isHidden = album === '隐藏';
            const albumCount = countPhotos((photo) => photo.album === album && (isHidden || !photo.hidden));
            return (
              <EntryCard
                key={album}
                icon={isHidden ? <LockKeyhole /> : <FolderOpen />}
                title={album}
                subtitle={`进入${album}相簿单独整理。`}
                count={albumCount}
                preview={previewPhoto((photo) => photo.album === album && (isHidden || !photo.hidden))}
                onClick={() => openCollection({ title: album, subtitle: `${album}相簿`, tab: isHidden ? 'hidden' : 'all', albumFilter: album })}
              />
            );
          })}
        </div>
      </Panel>
    </section>
  );
}
