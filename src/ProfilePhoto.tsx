import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { mediaUrl } from './api';

export default function ProfilePhoto({ name, photo, size = 'regular' }: { name: string; photo?: string; size?: 'regular' | 'large' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = photo ? mediaUrl(photo) : '';
  const initial = name.trim().slice(0, 1).toUpperCase();

  return (
    <span className={`profile-photo profile-photo-${size}`} aria-label={`${name}'s profile`} role="img">
      {image && !imageFailed
        ? <img src={image} alt="" onError={() => setImageFailed(true)} />
        : initial || <UserRound aria-hidden="true" />}
    </span>
  );
}
