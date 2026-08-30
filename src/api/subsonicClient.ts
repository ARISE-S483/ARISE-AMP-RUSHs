import md5 from 'md5';

export interface SubsonicConfig {
  url: string;
  username: string;
  password?: string;
  token?: string; // If using token authentication instead of password
  salt?: string;
}

export class SubsonicClient {
  private config: SubsonicConfig;
  private readonly clientVersion = '1.16.1';
  private readonly clientName = 'arise-amp-rush2';

  constructor(config: SubsonicConfig) {
    this.config = {
      ...config,
      url: config.url.replace(/\/$/, '')
    };
  }

  private getAuthParams(): string {
    const salt = Math.random().toString(36).substring(2, 15);
    const token = md5((this.config.password || '') + salt);
    
    return `u=${encodeURIComponent(this.config.username)}&t=${token}&s=${salt}&v=${this.clientVersion}&c=${this.clientName}&f=json`;
  }

  private async request(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(params).toString();
    const authParams = this.getAuthParams();
    const separator = endpoint.includes('?') ? '&' : '?';
    
    const url = `${this.config.url}/rest/${endpoint}${separator}${authParams}${queryParams ? '&' + queryParams : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Subsonic API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data['subsonic-response']?.status === 'failed') {
      throw new Error(`Subsonic API error: ${data['subsonic-response'].error?.message || 'Unknown error'}`);
    }
    
    return data['subsonic-response'];
  }

  async search(query: string) {
    const res = await this.request('search3.view', { query, songCount: '20', albumCount: '10', artistCount: '10' });
    return res.searchResult3;
  }

  async getTrack(id: string) {
    const res = await this.request('getSong.view', { id });
    return res.song;
  }

  async getAlbum(id: string) {
    const res = await this.request('getAlbum.view', { id });
    return res.album;
  }

  async getArtist(id: string) {
    const res = await this.request('getArtist.view', { id });
    return res.artist;
  }
  
  async getPlaylist(id: string) {
    const res = await this.request('getPlaylist.view', { id });
    return res.playlist;
  }

  getStreamUrl(id: string, maxBitrate?: string): string {
    const authParams = this.getAuthParams();
    let url = `${this.config.url}/rest/stream.view?id=${id}&${authParams}`;
    if (maxBitrate) {
       url += `&maxBitrate=${maxBitrate}`;
    }
    return url;
  }

  getCoverUrl(id: string, size?: string): string {
    const authParams = this.getAuthParams();
    let url = `${this.config.url}/rest/getCoverArt.view?id=${id}&${authParams}`;
    if (size) {
      url += `&size=${size}`;
    }
    return url;
  }
}
