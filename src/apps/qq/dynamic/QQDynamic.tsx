import { Heart, ImagePlus, MessageCircle, Palette, Send, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PersistentImage } from '../../../components/PersistentImage';
import { requestAppImage } from '../../../lib/appImageGeneration';
import { buildNovelAiPrompt, hashPrompt } from '../../../lib/naiImage';
import { createId } from '../../../lib/utils';
import { useAppStore } from '../../../store';
import {
  buildPersonaQqDynamicDraft,
  buildQqDynamicTextImage,
  formatQqDynamicTime,
  sortQqDynamicPosts,
} from './qqDynamicLogic';

export function QQDynamic() {
  const {
    qqDynamicPosts,
    characters,
    userName,
    userAvatar,
    imageGenerationConfig,
    imageGenerationEnabled,
    proactiveImageGenerationEnabled,
    addQqDynamicPost,
    deleteQqDynamicPost,
    toggleQqDynamicLike,
    addQqDynamicComment,
    recordGeneratedImage,
    addAppLog,
  } = useAppStore();
  const [content, setContent] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageSource, setImageSource] = useState<'generated' | 'fallback' | 'upload' | undefined>();
  const [generating, setGenerating] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const posts = useMemo(() => sortQqDynamicPosts(qqDynamicPosts), [qqDynamicPosts]);
  const personaCharacter = characters.length > 0 ? characters[qqDynamicPosts.length % characters.length] : null;

  const buildFallbackImage = () => {
    const nextImage = buildQqDynamicTextImage({
      authorName: userName || '我',
      content: imagePrompt || content || '今天也在 QQ 空间留下一张文字图片。',
      seed: Date.now(),
    });
    setImageUrl(nextImage);
    setImageSource('fallback');
  };

  const generateImage = async () => {
    const prompt = (imagePrompt || content).trim();
    if (!prompt || generating) return;
    setGenerating(true);
    const imageId = createId('qq-space-image');
    const fullPrompt = buildNovelAiPrompt(`QQ space post cover, casual mobile social feed image, ${prompt}`, 'gallery');
    const promptHash = hashPrompt(fullPrompt);
    try {
      addAppLog({ type: 'image', title: 'QQ 空间生图开始', detail: `prompt_hash=${promptHash}; model=${imageGenerationConfig.model}` });
      const nextImage = await requestAppImage({
        config: imageGenerationConfig,
        prompt: fullPrompt,
        triggerType: 'manual',
        imageGenerationEnabled,
        proactiveImageGenerationEnabled,
        timeoutMs: 45000,
        source: 'qq-space',
      });
      recordGeneratedImage({
        imageId,
        botId: 'qq-space',
        characterId: 'qq-space',
        guildId: 'local',
        channelId: 'qq-dynamic',
        userId: userName || 'local-user',
        triggerType: 'manual',
        promptHash,
        promptText: fullPrompt,
        storageUrl: nextImage,
        createdAt: Date.now(),
        width: imageGenerationConfig.width,
        height: imageGenerationConfig.height,
        model: imageGenerationConfig.model,
        status: 'success',
      });
      addAppLog({ type: 'image', title: 'QQ 空间生图成功', detail: `prompt_hash=${promptHash}; image_id=${imageId}` });
      setImageUrl(nextImage);
      setImageSource('generated');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      addAppLog({ type: 'error', title: 'QQ 空间生图失败，已改用文字图片', detail: `prompt_hash=${promptHash}; error=${detail}` });
      buildFallbackImage();
    } finally {
      setGenerating(false);
    }
  };

  const publishPost = () => {
    const cleanContent = content.trim();
    if (!cleanContent && !imageUrl) return;
    addQqDynamicPost({
      authorId: 'user',
      authorName: userName || '我',
      authorAvatar: userAvatar || undefined,
      content: cleanContent || imagePrompt || '分享了一张 QQ 空间图片。',
      imageUrl: imageUrl || undefined,
      imagePrompt: imagePrompt.trim() || undefined,
      imageSource,
      createdAt: Date.now(),
    });
    setContent('');
    setImagePrompt('');
    setImageUrl('');
    setImageSource(undefined);
  };

  const publishPersonaPost = () => {
    if (!personaCharacter) return;
    const draft = buildPersonaQqDynamicDraft({
      character: personaCharacter,
      createdAt: Date.now(),
    });
    addQqDynamicPost({
      ...draft,
      imageUrl: buildQqDynamicTextImage({
        authorName: draft.authorName,
        content: draft.content,
        seed: draft.createdAt,
      }),
      imageSource: 'fallback',
    });
  };

  const sendComment = (postId: string) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft) return;
    addQqDynamicComment(postId, {
      authorId: 'user',
      authorName: userName || '我',
      authorAvatar: userAvatar || undefined,
      content: draft,
      createdAt: Date.now(),
    });
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
  };

  return (
    <div className="qq-feed-list qq-dynamic-feed">
      <div className="qq-dynamic-composer rich">
        <div className="qq-dynamic-composer-title">
          <Sparkles className="h-6 w-6" />
          <div>
            <strong>好友动态</strong>
            <span>写说说、配图、点赞和评论都会保存在 QQ 空间里。</span>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="今天想发点什么动态？"
        />
        <input
          value={imagePrompt}
          onChange={(event) => setImagePrompt(event.target.value)}
          placeholder="配图提示词，可留空使用说说内容"
        />
        {imageUrl && (
          <figure className="qq-dynamic-image-preview">
            <PersistentImage src={imageUrl} alt="QQ 空间配图预览" />
            <figcaption>{imageSource === 'generated' ? 'AI 生图配图' : '文字图片配图'}</figcaption>
          </figure>
        )}
        <div className="qq-dynamic-composer-actions">
          <button type="button" onClick={publishPersonaPost} disabled={!personaCharacter}>
            <Sparkles className="h-4 w-4" />
            角色发动态
          </button>
          <button type="button" onClick={buildFallbackImage}>
            <Palette className="h-4 w-4" />
            文字图片
          </button>
          {imageGenerationEnabled && (
            <button type="button" onClick={generateImage} disabled={generating || !(imagePrompt.trim() || content.trim())}>
              <ImagePlus className="h-4 w-4" />
              {generating ? '生成中' : '生成配图'}
            </button>
          )}
          <button type="button" onClick={publishPost} disabled={!content.trim() && !imageUrl}>
            <Send className="h-4 w-4" />
            发表
          </button>
        </div>
      </div>

      {posts.length === 0 && (
        <div className="qq-empty-state static">
          <Sparkles className="h-6 w-6" />
          <span>还没有 QQ 空间动态，先发一条说说吧。</span>
        </div>
      )}

      {posts.map((post) => (
        <article key={post.id} className="qq-dynamic-post">
          <header>
            <span className="qq-dynamic-avatar">
              {post.authorAvatar ? <PersistentImage src={post.authorAvatar} alt="" /> : post.authorName.slice(0, 1)}
            </span>
            <div>
              <strong>{post.authorName}</strong>
              <small>{formatQqDynamicTime(post.createdAt)}</small>
            </div>
            {post.authorId === 'user' && (
              <button type="button" onClick={() => deleteQqDynamicPost(post.id)} aria-label="删除动态">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </header>
          <p>{post.content}</p>
          {post.imageUrl && <PersistentImage src={post.imageUrl} alt="QQ 空间动态配图" className="qq-dynamic-post-image" />}
          <div className="qq-dynamic-post-actions">
            <button type="button" onClick={() => toggleQqDynamicLike(post.id, 'user')} className={post.likes.includes('user') ? 'active' : ''}>
              <Heart className="h-4 w-4" />
              {post.likes.length || '赞'}
            </button>
            <span><MessageCircle className="h-4 w-4" /> {post.comments.length}</span>
          </div>
          {post.comments.length > 0 && (
            <div className="qq-dynamic-comments">
              {post.comments.map((comment) => (
                <p key={comment.id}><b>{comment.authorName}</b>：{comment.content}</p>
              ))}
            </div>
          )}
          <div className="qq-dynamic-comment-box">
            <input
              value={commentDrafts[post.id] || ''}
              onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendComment(post.id);
              }}
              placeholder="写评论"
            />
            <button type="button" onClick={() => sendComment(post.id)} disabled={!commentDrafts[post.id]?.trim()}>
              发送
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
