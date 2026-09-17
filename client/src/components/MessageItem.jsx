import { memo } from 'react';
import { assetUrl, downloadUrl } from '../lib/api.js';
import { formatSize } from '../lib/files.js';
import { formatTime } from '../lib/util.js';
import Avatar from './Avatar.jsx';
import FileBadge from './FileBadge.jsx';
import Icon from './Icon.jsx';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

function Linkified({ text }) {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function Attachment({ message, onMediaLoad }) {
  const { attachment_url: url, attachment_name: name, attachment_type: type } = message;

  if (type === 'image') {
    return (
      <a className="att-image" href={assetUrl(url)} target="_blank" rel="noopener noreferrer">
        <img src={assetUrl(url)} alt={name} onLoad={onMediaLoad} />
      </a>
    );
  }

  return (
    <a className="att-file" href={downloadUrl(url, name)} rel="noopener noreferrer">
      <FileBadge type={type} />
      <span className="att-file__meta">
        <strong title={name}>{name}</strong>
        <small>{formatSize(message.attachment_size)}</small>
      </span>
      <span className="att-file__download">
        <Icon name="download" size={18} />
      </span>
    </a>
  );
}

function MessageItem({ message, mine, continued, onMediaLoad }) {
  const classes = ['msg', mine && 'msg--mine', continued && 'msg--continued'].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {!mine && (
        <div className="msg__avatar">{!continued && <Avatar name={message.sender_name} />}</div>
      )}
      <div className="msg__main">
        {!mine && !continued && <div className="msg__name">{message.sender_name}</div>}
        <div className="msg__line">
          <div className="msg__stack">
            {message.attachment_url && <Attachment message={message} onMediaLoad={onMediaLoad} />}
            {message.content && (
              <div className="bubble">
                <Linkified text={message.content} />
              </div>
            )}
          </div>
          <time className="msg__time" dateTime={message.created_at}>
            {formatTime(message.created_at)}
          </time>
        </div>
      </div>
    </div>
  );
}

export default memo(MessageItem);
