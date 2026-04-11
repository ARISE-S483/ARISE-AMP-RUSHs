// @ts-nocheck
import { ByteVector } from '../../node_modules/@dantheman827/taglib-ts/src/byteVector.ts';
import { Mp4Tag, Mp4Item } from '../../node_modules/@dantheman827/taglib-ts/src/mp4/mp4Tag.ts';
import { Variant } from '../../node_modules/@dantheman827/taglib-ts/src/toolkit/variant.ts';
import { FileRef } from '../../node_modules/@dantheman827/taglib-ts/src/fileRef.ts';
import { ChunkedByteVectorStream } from '../../node_modules/@dantheman827/taglib-ts/src/toolkit/chunkedByteVectorStream.ts';
import { ReadStyle } from '../../node_modules/@dantheman827/taglib-ts/src/toolkit/types';
import { BlobStream } from '../../node_modules/@dantheman827/taglib-ts/src/toolkit/blobStream.ts';
import { Mp4File } from '../../node_modules/@dantheman827/taglib-ts/src/mp4/mp4File.ts';
import { MpegFile } from '../../node_modules/@dantheman827/taglib-ts/src/mpeg/mpegFile.ts';

// Pre-import necessary format handlers
import '../../node_modules/@dantheman827/taglib-ts/src/flac/flacFile.ts';
import '../../node_modules/@dantheman827/taglib-ts/src/mpeg/mpegFile.ts';
import '../../node_modules/@dantheman827/taglib-ts/src/mp4/mp4File.ts';
import '../../node_modules/@dantheman827/taglib-ts/src/ogg/oggFile.ts';
import '../../node_modules/@dantheman827/taglib-ts/src/ogg/vorbis/vorbisFile.ts';

export interface TaglibInputData {
  title?: string;
  artist?: string;
  albumTitle?: string;
  albumArtist?: string;
  coverData?: Uint8Array;
  coverMime?: string;
}

export interface TaglibParsedData {
  title?: string;
  artist?: string;
  albumTitle?: string;
  albumArtist?: string;
  duration?: number;
  coverData?: Uint8Array;
  coverMime?: string;
}

async function getFileRef(audioData: Uint8Array | Blob): Promise<FileRef | null> {
  let stream;
  if (audioData instanceof Blob) {
    stream = new BlobStream(audioData as any);
  } else {
    stream = new ChunkedByteVectorStream(audioData);
  }
  return await FileRef.open(stream as any, true, ReadStyle.Average);
}

export async function addMetadataToAudioBlob(blob: Blob, meta: TaglibInputData): Promise<Blob> {
  const ref = await getFileRef(blob);
  if (!ref || !ref.isValid) {
    console.warn('Failed to open file for tagging');
    return blob;
  }

  const underlying = ref.file();
  const isMp4 = underlying instanceof Mp4File;
  const isMpeg = underlying instanceof MpegFile;

  const props = ref.properties();

  if (meta.title) props.replace('TITLE', [meta.title]);
  if (meta.artist) props.replace('ARTIST', [meta.artist]);
  if (meta.albumTitle) props.replace('ALBUM', [meta.albumTitle]);
  if (meta.albumArtist) props.replace('ALBUMARTIST', [meta.albumArtist]);

  ref.setProperties(props);

  if (meta.coverData && meta.coverMime) {
    const pictureMap = new Map<string, Variant>();
    pictureMap.set('data', Variant.fromByteVector(ByteVector.fromByteArray(meta.coverData as any) as any));
    pictureMap.set('mimeType', Variant.fromString(meta.coverMime));
    pictureMap.set('pictureType', Variant.fromInt(3)); // FrontCover
    ref.setComplexProperties('PICTURE', [pictureMap] as any);
  }

  await ref.save();

  const file = ref.file() as any;
  const stream = file.stream();

  if (stream instanceof BlobStream) {
    return (stream as any).toBlob();
  } else if (stream instanceof ChunkedByteVectorStream) {
    const data = (stream as any).data().data;
    return new Blob([data as any], { type: blob.type || 'application/octet-stream' });
  }

  return blob;
}

export async function parseAudioMetadata(blob: Blob): Promise<TaglibParsedData> {
  const data: TaglibParsedData = {};
  const ref = await getFileRef(blob);

  if (!ref || !ref.isValid) return data;

  const ap = ref.audioProperties();
  if (ap) data.duration = ap.lengthInSeconds;

  const props = ref.properties();

  data.title = props.get('TITLE')?.[0] || undefined;
  data.artist = props.get('ARTIST')?.[0] || undefined;
  data.albumTitle = props.get('ALBUM')?.[0] || undefined;
  data.albumArtist = props.get('ALBUMARTIST')?.[0] || undefined;

  const pictures = ref.complexProperties('PICTURE');
  if (pictures && pictures.length > 0) {
    const pic = pictures[0];
    const picData = (pic.get('data') as any)?.toByteVector();
    const mimeType = (pic.get('mimeType') as any)?.toString() ?? '';
    if (picData && picData.length > 0) {
      data.coverData = new Uint8Array(picData.data);
      data.coverMime = mimeType;
    }
  }

  return data;
}
