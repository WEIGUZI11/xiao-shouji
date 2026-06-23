import { ImagePlus, Lock, Palette, Send, SmilePlus, Users } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';

import type { Character } from '../../../store';
import {
  momentDecorationLabels,
  momentMoodLabels,
  normalizeMomentContent,
  type MomentDecoration,
  type MomentDraft,
  type MomentMood,
  type MomentVisibility,
} from './momentsLogic';

const moodOptions = Object.entries(momentMoodLabels) as Array<[MomentMood, string]>;
const decorationOptions = Object.entries(momentDecorationLabels) as Array<[MomentDecoration, string]>;
const visibilityOptions: Array<{ value: MomentVisibility; label: string }> = [
  { value: 'public', label: '公开' },
  { value: 'selected', label: '部分可见' },
  { value: 'private', label: '仅自己' },
];

export function MomentComposer({
  characters,
  onPublish,
}: {
  characters: Character[];
  onPublish: (draft: MomentDraft) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MomentMood>('daily');
  const [visibility, setVisibility] = useState<MomentVisibility>('public');
  const [decoration, setDecoration] = useState<MomentDecoration>('plain');
  const [visibleCharacterIds, setVisibleCharacterIds] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const publish = () => {
    if (!normalizeMomentContent(content)) return;
    onPublish({ content, mood, visibility, decoration, visibleCharacterIds, images });
    setContent('');
    setMood('daily');
    setVisibility('public');
    setDecoration('plain');
    setVisibleCharacterIds([]);
    setImages([]);
  };

  const uploadImages = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.currentTarget.files;
    const files: File[] = [];
    if (fileList) {
      const maxImages = Math.max(0, 3 - images.length);
      for (let index = 0; index < fileList.length && files.length < maxImages; index += 1) {
        const file = fileList.item(index);
        if (file) files.push(file);
      }
    }
    if (files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((current) => [...current, reader.result as string].slice(0, 3));
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const toggleVisibleCharacter = (id: string) => {
    setVisibleCharacterIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <section className="wechat-moment-composer">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="这一刻的想法..."
        className="wechat-moment-input"
      />

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <button key={`${image}-${index}`} type="button" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="aspect-square overflow-hidden rounded-[6px] border border-black/10">
              <img src={image} alt="朋友圈图片" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => imageInputRef.current?.click()} className="wechat-mini-button" title="图片">
          <ImagePlus className="h-4 w-4" />
          图片
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={uploadImages} className="hidden" />

        <div className="flex flex-wrap items-center gap-1">
          <SmilePlus className="h-4 w-4 opacity-60" />
          {moodOptions.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMood(value)} className={mood === value ? 'wechat-mini-button' : 'wechat-mini-button opacity-60'}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Palette className="h-4 w-4 opacity-60" />
          {decorationOptions.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDecoration(value)} className={decoration === value ? 'wechat-mini-button' : 'wechat-mini-button opacity-60'}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {visibilityOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => setVisibility(option.value)} className={visibility === option.value ? 'wechat-mini-button' : 'wechat-mini-button opacity-60'}>
            {option.value === 'private' ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {option.label}
          </button>
        ))}
        <button type="button" onClick={publish} disabled={!normalizeMomentContent(content)} className="wechat-mini-button ml-auto">
          <Send className="h-4 w-4" />
          发表
        </button>
      </div>

      {visibility === 'selected' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {characters.map((character) => (
            <button key={character.id} type="button" onClick={() => toggleVisibleCharacter(character.id)} className={visibleCharacterIds.includes(character.id) ? 'wechat-mini-button' : 'wechat-mini-button opacity-60'}>
              {character.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
