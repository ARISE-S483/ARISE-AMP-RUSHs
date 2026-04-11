import md5 from 'md5';
import type { Track } from './types';

export class LastFMClient {
  private API_KEY = 'a59883f6aa02912494e0f2922f9af8cb'; // User's generated key for ARISE-AMP-RUSH
  private API_SECRET = 'b5c56fc5adbe52b8771a684fc477129e';
  private API_URL = 'https://ws.audioscrobbler.com/2.0/';

  private sessionKey: string | null = null;
  private username: string | null = null;
  private currentTrack: Track | null = null;
  private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;
  private hasScrobbled = false;
  private isScrobbling = false;

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const session = localStorage.getItem('lastfm-session');
      if (session) {
        const data = JSON.parse(session);
        this.sessionKey = data.key;
        this.username = data.name;
      }
    } catch {
      console.error('Failed to load Last.fm session');
    }
  }

  private saveSession(sessionKey: string, username: string) {
    this.sessionKey = sessionKey;
    this.username = username;
    localStorage.setItem(
      'lastfm-session',
      JSON.stringify({ key: sessionKey, name: username })
    );
  }

  clearSession() {
    this.sessionKey = null;
    this.username = null;
    localStorage.removeItem('lastfm-session');
  }

  isAuthenticated(): boolean {
    return !!this.sessionKey;
  }

  private getScrobbleArtist(track?: Track | null): string {
    if (!track) return 'Unknown Artist';
    
    let artistName = 'Unknown Artist';
    if (track.artist?.name) {
      artistName = track.artist.name;
    } else if (track.artists && track.artists.length > 0) {
      artistName = track.artists[0].name || 'Unknown Artist';
    }

    // Strip featured artists: split on &, feat., ft., featuring, with, x
    artistName = artistName
      .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
      .trim();

    return artistName || 'Unknown Artist';
  }

  private generateSignature(params: Record<string, string | number>): string {
    const filteredParams = { ...params };
    delete filteredParams.format;
    delete filteredParams.callback;

    const sortedKeys = Object.keys(filteredParams).sort();
    const signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join('') + this.API_SECRET;

    return md5(signatureString);
  }

  private async makeRequest(method: string, params: Record<string, string | number> = {}, requiresAuth = false): Promise<any> {
    const requestParams: Record<string, string | number> = {
      method,
      api_key: this.API_KEY,
      ...params,
    };

    if (requiresAuth && this.sessionKey) {
      requestParams.sk = this.sessionKey;
    }

    const signature = this.generateSignature(requestParams);

    const formData = new URLSearchParams({
      ...(requestParams as Record<string, string>),
      api_sig: signature,
      format: 'json',
    });

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.message || 'Last.fm API error');
      return data;
    } catch (error) {
      console.error('Last.fm API request failed:', error);
      throw error;
    }
  }

  async getAuthUrl(): Promise<{ token: string; url: string }> {
    try {
      const data = await this.makeRequest('auth.getToken');
      const token = data.token;
      const cb = encodeURIComponent(`${window.location.origin}/library`); // Return to app safely
      return {
        token,
        url: `https://www.last.fm/api/auth/?api_key=${this.API_KEY}&token=${token}&cb=${cb}`,
      };
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      throw error;
    }
  }

  async completeAuthentication(token: string): Promise<{ success: boolean; username?: string }> {
    try {
      const data = await this.makeRequest('auth.getSession', { token });
      if (data.session) {
        this.saveSession(data.session.key, data.session.name);
        return { success: true, username: data.session.name };
      }
      throw new Error('No session returned');
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async updateNowPlaying(track: Track | null) {
    if (!this.isAuthenticated() || !track) return;

    this.currentTrack = track;
    if (!this.isScrobbling) this.hasScrobbled = false;
    this.clearScrobbleTimer();

    try {
      const params: Record<string, string | number> = {
        artist: this.getScrobbleArtist(track),
        track: track.title,
      };

      if (track.album?.title) params.album = track.album.title;
      if (track.duration) params.duration = Math.floor(track.duration);

      await this.makeRequest('track.updateNowPlaying', params, true);
      console.log('[Last.fm] Now playing updated:', track.title);

      // Scrobble at 50% or 4 minutes, whichever is earlier
      const scrobblePercentage = 0.5;
      const threshold = Math.min((track.duration || 180) * scrobblePercentage, 240);
      this.scheduleScrobble(threshold * 1000);
    } catch (error) {
      console.error('Failed to update now playing:', error);
    }
  }

  private scheduleScrobble(delay: number) {
    this.clearScrobbleTimer();
    this.scrobbleTimer = setTimeout(() => this.scrobbleCurrentTrack(), delay);
  }

  private clearScrobbleTimer() {
    if (this.scrobbleTimer) {
      clearTimeout(this.scrobbleTimer);
      this.scrobbleTimer = null;
    }
  }

  async scrobbleCurrentTrack() {
    if (!this.isAuthenticated() || !this.currentTrack || this.hasScrobbled) return;

    this.isScrobbling = true;
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        artist: this.getScrobbleArtist(this.currentTrack),
        track: this.currentTrack.title,
        timestamp,
      };

      if (this.currentTrack.album?.title) params.album = this.currentTrack.album.title;
      if (this.currentTrack.duration) params.duration = Math.floor(this.currentTrack.duration);

      await this.makeRequest('track.scrobble', params, true);

      this.hasScrobbled = true;
      console.log('[Last.fm] Scrobbled:', this.currentTrack.title);
    } catch (error) {
      console.error('Failed to scrobble:', error);
    } finally {
      this.isScrobbling = false;
    }
  }

  async loveTrack(track: Track) {
    if (!this.isAuthenticated()) return;

    try {
      const params = {
        artist: this.getScrobbleArtist(track),
        track: track.title,
      };
      await this.makeRequest('track.love', params, true);
      console.log('[Last.fm] Loved track:', track.title);
    } catch (error) {
      console.error('Failed to love track:', error);
    }
  }

  onTrackSubmit(track: Track) {
    this.updateNowPlaying(track);
  }

  onPlaybackStop() {
    this.clearScrobbleTimer();
  }
}

export const lastfmClient = new LastFMClient();
