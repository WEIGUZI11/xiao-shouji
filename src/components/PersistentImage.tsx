import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';

import { isImageAssetReference, resolveImageAsset } from '../lib/imageAssetStore';

type PersistentImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: ReactNode;
};

export function PersistentImage({ src = '', alt = '', fallback, onError, ...props }: PersistentImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(isImageAssetReference(src) ? '' : src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!isImageAssetReference(src)) {
      setResolvedSrc(src);
      return () => { active = false; };
    }
    setResolvedSrc('');
    resolveImageAsset(src).then((value) => {
      if (active) setResolvedSrc(value);
    }).catch(() => {
      if (active) setResolvedSrc('');
    });
    return () => { active = false; };
  }, [src]);

  if (!resolvedSrc || failed) {
    if (fallback) return <>{fallback}</>;
    return <span className={props.className} role="img" aria-label={alt || '图片加载中'} />;
  }
  return <img {...props} src={resolvedSrc} alt={alt} onError={(event) => {
    setFailed(true);
    onError?.(event);
  }} />;
}
