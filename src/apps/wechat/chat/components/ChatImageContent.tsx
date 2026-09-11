import { Image as ImageIcon } from 'lucide-react';

import { PersistentImage } from '../../../../components/PersistentImage';
import { isPersistedImagePlaceholder } from '../../../../storePersistence';

export function ChatImageContent({
  content,
  alt,
}: {
  content: string;
  alt: string;
}) {
  if (isPersistedImagePlaceholder(content)) {
    return (
      <div className="wechat-image-placeholder">
        <ImageIcon className="h-5 w-5" />
        <span>Image preview cleared</span>
      </div>
    );
  }

  return <PersistentImage src={content} className="wechat-image-message" alt={alt} />;
}
