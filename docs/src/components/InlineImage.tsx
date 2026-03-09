import React from 'react';

interface InlineImageProps {
  src: string;
  alt: string;
  position?: 'left' | 'right';
}

export default function InlineImage({
  src,
  alt,
  position = 'right',
}: InlineImageProps) {
  return (
    <img
      src={require(`@site/static${src}`).default}
      alt={alt}
      className={position === 'left' ? 'img-left' : 'img-right'}
    />
  );
}
