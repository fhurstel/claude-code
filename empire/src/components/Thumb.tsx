import { Link } from 'react-router-dom';
import type { Photo } from '../db';
import { useObjectUrl } from '../hooks';
import { formatTime } from '../format';

export function Thumb({ photo, caption }: { photo: Photo; caption?: string }) {
  const url = useObjectUrl(photo.thumb);
  return (
    <Link to={`/photos/${photo.id}`} className="thumb" aria-label={`Photo taken ${formatTime(photo.takenAt)}`}>
      {url && <img src={url} alt="" loading="lazy" />}
      <span className="thumb-meta">
        {caption ?? formatTime(photo.takenAt)}
        {(photo.note || photo.annotated) && <span className="dot" title="Has notes or markup" />}
      </span>
    </Link>
  );
}
