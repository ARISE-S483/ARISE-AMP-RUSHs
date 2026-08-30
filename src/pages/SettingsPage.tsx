import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Volume2, Download, Palette, Music, Mic2, Activity,
  LayoutDashboard, RotateCcw, ChevronRight, Server, Radio, Brush, Database, Upload, FolderDown,
  User, Headphones
} from 'lucide-react';
import { EQStudio } from '../components/settings/EQStudio';
import { exportLibrary, importLibrary } from '@/lib/syncExport';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore, applyTheme } from '@/stores/themeStore';
import { useLastFmStore } from '@/stores/lastfmStore';
import { useListenBrainzStore } from '@/stores/listenbrainzStore';
import { useProfileStore } from '@/stores/profileStore';
import { useSpotifyStore } from '@/stores/spotifyStore';
import { lastfmClient } from '@/api/lastfmClient';
import { useToast } from '@/hooks/use-toast';
import InstancesManager from '@/components/settings/InstancesManager';
import SyncManagement from '@/components/settings/SyncManagement';
import type {
  VisualizerStyle,
  LyricsSize, BackgroundStyle, NowPlayingStyle, BackgroundImage
} from '@/stores/settingsStore';
import { saveBackgroundData } from '@/lib/backgroundStore';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'themes', label: 'Themes', icon: Brush },
  { id: 'nowplaying', label: 'Now Playing', icon: Music },
  { id: 'lyrics', label: 'Lyrics', icon: Mic2 },
  { id: 'visualizer', label: 'Visualizer', icon: Activity },
  { id: 'sidebar', label: 'Sidebar', icon: LayoutDashboard },
  { id: 'integrations', label: 'Integrations', icon: Radio },
  { id: 'instances', label: 'Instances', icon: Server },
  { id: 'data', label: 'Data', icon: Database },
] as const;

type TabId = typeof tabs[number]['id'];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
        checked ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <motion.div
        className={`absolute top-0.5 w-4 h-4 rounded-full ${
          checked ? 'bg-primary-foreground' : 'bg-muted-foreground'
        }`}
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function Select<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border focus:ring-1 focus:ring-primary/20 cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-20 accent-primary"
      />
      <span className="text-xs text-muted-foreground w-10 text-right">{value}{suffix}</span>
    </div>
  );
}

function ThemePicker() {
  const { getAllThemes, activeThemeId, setActiveTheme } = useThemeStore();
  const themes = getAllThemes();

  return (
    <div>
      <h2 className="font-display font-semibold text-base mb-3">Themes</h2>
      <p className="text-xs text-muted-foreground mb-4">Choose a color theme for your app</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {themes.map(theme => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTheme(theme.id)}
            className={`relative p-3 rounded-xl border-2 transition-all ${
              activeThemeId === theme.id
                ? 'border-primary shadow-lg shadow-primary/20'
                : 'border-border/50 hover:border-border'
            }`}
            style={{ background: `hsl(${theme.colors.background})` }}
          >
            <div className="flex gap-1 mb-2">
              <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${theme.colors.primary})` }} />
              <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${theme.colors.accent})` }} />
              <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${theme.colors.secondary})` }} />
            </div>
            <p className="text-xs font-medium" style={{ color: `hsl(${theme.colors.foreground})` }}>
              {theme.name}
            </p>
            <p className="text-[10px] opacity-60" style={{ color: `hsl(${theme.colors.foreground})` }}>
              {theme.author}
            </p>
            {activeThemeId === theme.id && (
              <motion.div
                layoutId="theme-check"
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const { toast } = useToast();
  const settings = useSettingsStore();
  const setSetting = settings.setSetting;
  const lastfm = useLastFmStore();
  const listenbrainz = useListenBrainzStore();
  const spotify = useSpotifyStore();
  const profile = useProfileStore();

  useEffect(() => {
    // Last.fm OAuth Callback Handler
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      lastfmClient.completeAuthentication(token)
        .then((res) => {
          if (res.success && res.username) {
            lastfm.setUsername(res.username);
            lastfm.setSessionKey('authenticated'); // Trigger reactive state update
            
            // Clean up the URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.toString());
            
            toast({ title: 'Last.fm Connected', description: `Successfully connected as ${res.username}` });
            setActiveTab('integrations');
          }
        })
        .catch(() => {
          toast({ title: 'Authentication Failed', description: 'Failed to connect to Last.fm', variant: 'destructive' });
        });
    }
  }, [lastfm, toast]);

  return (
    <motion.div className="p-4 md:p-6 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-muted-foreground" />
        <h1 className="font-display text-xl md:text-2xl font-bold">Settings</h1>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Tab nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:w-48 flex-shrink-0">
          {tabs.filter(t => t.id !== 'integrations').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <tab.icon size={16} strokeWidth={1.5} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={12} className="ml-auto hidden md:block" />}
            </button>
          ))}

          <div className="border-t border-border mt-2 pt-2">
            <button
              onClick={settings.resetSettings}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <RotateCcw size={16} strokeWidth={1.5} />
              Reset All
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="glass-card rounded-xl p-4 md:p-5"
            >
              {activeTab === 'profile' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Profile</h2>
                  <SettingRow label="Display Name" description="Your name shown in the sidebar">
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => profile.setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-40 focus:ring-1 focus:ring-primary/20"
                    />
                  </SettingRow>
                  <SettingRow label="Avatar URL" description="Link to your profile picture">
                    <input
                      type="text"
                      value={profile.avatarUrl}
                      onChange={(e) => profile.setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-40 focus:ring-1 focus:ring-primary/20"
                    />
                  </SettingRow>
                  <SettingRow label="Bio" description="A short description about you">
                    <input
                      type="text"
                      value={profile.bio}
                      onChange={(e) => profile.setBio(e.target.value)}
                      placeholder="Music enthusiast..."
                      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-40 focus:ring-1 focus:ring-primary/20"
                    />
                  </SettingRow>
                  <SettingRow label="Public Profile" description="Allow others to see your profile">
                    <Toggle checked={profile.isPublic} onChange={(v) => profile.setIsPublic(v)} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'audio' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Audio Settings</h2>
                  <SettingRow label="Streaming Quality" description="Default playback quality for streams">
                    <Select<string>
                      value={settings.audioQuality}
                      options={[
                        { value: 'auto', label: 'Auto (Adaptive)' },
                        { value: 'DOLBY_ATMOS_EAC3_HIGH', label: 'Dolby Atmos — E-AC-3 High' },
                        { value: 'DOLBY_ATMOS_EAC3_LOW', label: 'Dolby Atmos — E-AC-3 Low' },
                        { value: 'DOLBY_ATMOS_AC4_HIGH', label: 'Dolby Atmos — AC-4 High' },
                        { value: 'DOLBY_ATMOS_AC4_LOW', label: 'Dolby Atmos — AC-4 Low' },
                        { value: 'HI_RES_LOSSLESS', label: 'Hi-Res Lossless (24-bit)' },
                        { value: 'LOSSLESS', label: 'Lossless (16-bit)' },
                        { value: 'HIGH', label: 'High' },
                        { value: 'LOW', label: 'Low' },
                      ]}
                      onChange={(v) => setSetting('audioQuality', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Prefer Dolby Atmos" description="Automatically request Dolby Atmos spatial audio on Tidal when available">
                    <Toggle checked={settings.preferDolbyAtmos} onChange={(v) => setSetting('preferDolbyAtmos', v)} />
                  </SettingRow>
                  <SettingRow label="Native OS Dolby Atmos Rendering" description="Render Atmos directly on Safari (Apple Spatial Audio) or Edge (Windows Dolby Audio) for full volume">
                    <Toggle checked={settings.nativeOsAtmos} onChange={(v) => setSetting('nativeOsAtmos', v)} />
                  </SettingRow>
                  <SettingRow label="Show Quality Badges" description="Display HD badge for Hi-Res tracks">
                    <Toggle checked={settings.showQualityBadges} onChange={(v) => setSetting('showQualityBadges', v)} />
                  </SettingRow>
                  <SettingRow label="Album release year" description="Show original album year instead of track/remaster date">
                    <Toggle checked={settings.albumReleaseYear} onChange={(v) => setSetting('albumReleaseYear', v)} />
                  </SettingRow>
                  <SettingRow label="Gapless Playback" description="Play audio without interruption between tracks">
                    <Toggle checked={settings.gaplessPlayback} onChange={(v) => setSetting('gaplessPlayback', v)} />
                  </SettingRow>
                  <SettingRow label="Remove Silence" description="Skip leading silence and move to the next track when trailing silence begins">
                    <Toggle checked={settings.silenceRemoval} onChange={(v) => setSetting('silenceRemoval', v)} />
                  </SettingRow>
                  <SettingRow label="Crossfade" description="Overlap tracks with an equal-power fade">
                    <Toggle checked={settings.crossfade} onChange={(v) => setSetting('crossfade', v)} />
                  </SettingRow>
                  {settings.crossfade && (
                    <SettingRow label="Crossfade Duration" description="Choose how long both tracks overlap">
                      <Select<string>
                        value={String(settings.crossfadeDuration)}
                        options={[
                          { value: '1', label: '1 second' },
                          { value: '2', label: '2 seconds' },
                          { value: '3', label: '3 seconds' },
                          { value: '4', label: '4 seconds' },
                          { value: '5', label: '5 seconds' },
                          { value: '6', label: '6 seconds' },
                          { value: '8', label: '8 seconds' },
                          { value: '10', label: '10 seconds' },
                          { value: '12', label: '12 seconds' },
                        ]}
                        onChange={(v) => setSetting('crossfadeDuration', Number(v))}
                      />
                    </SettingRow>
                  )}
                  <SettingRow label="Replay Gain Mode" description="Normalize volume across tracks automatically">
                    <Select<string>
                      value={settings.replayGainMode}
                      options={[
                        { value: 'off', label: 'Off' },
                        { value: 'track', label: 'Track' },
                        { value: 'album', label: 'Album' },
                      ]}
                      onChange={(v) => setSetting('replayGainMode', v)}
                    />
                  </SettingRow>
                  {settings.replayGainMode !== 'off' && (
                    <SettingRow label="Replay Gain Pre-amp" description="Adjust base volume for Replay Gain">
                      <NumberInput value={settings.replayGainPreamp} onChange={(v) => setSetting('replayGainPreamp', v)} min={-10} max={10} step={0.1} suffix="dB" />
                    </SettingRow>
                  )}
                  <SettingRow label="Mono Audio" description="Combine left and right channels into mono">
                    <Toggle checked={settings.monoAudio} onChange={(v) => setSetting('monoAudio', v)} />
                  </SettingRow>
                  <SettingRow label="Exponential Volume" description="More natural volume control curve">
                    <Toggle checked={settings.exponentialVolume} onChange={(v) => setSetting('exponentialVolume', v)} />
                  </SettingRow>
                  <SettingRow label="Playback Speed" description="Adjust playback speed">
                    <NumberInput value={settings.playbackSpeed} onChange={(v) => setSetting('playbackSpeed', v)} min={0.5} max={2.0} step={0.05} suffix="x" />
                  </SettingRow>
                  <SettingRow label="Preserve Pitch" description="Keep the original pitch when changing playback speed">
                    <Toggle checked={settings.preservePitch} onChange={(v) => setSetting('preservePitch', v)} />
                  </SettingRow>
                  <SettingRow label="Binaural / Spatial DSP" description="Multichannel HRTF rendering for Atmos & 3D Audio, crossfeed for stereo">
                    <Toggle checked={settings.binauralDsp} onChange={(v) => setSetting('binauralDsp', v)} />
                  </SettingRow>
                  {settings.binauralDsp && (
                    <div className="pl-4 border-l border-border/50 ml-2 mt-2 mb-2 space-y-1">
                      <SettingRow label="Auto-enable for Spatial Audio" description="Automatically activate when Atmos or 3D content is detected">
                        <Toggle checked={settings.autoEnableSpatial} onChange={(v) => setSetting('autoEnableSpatial', v)} />
                      </SettingRow>
                      <SettingRow label="Crossfeed" description="Simulate speaker presentation on headphones">
                        <Toggle checked={settings.binauralCrossfeed} onChange={(v) => setSetting('binauralCrossfeed', v)} />
                      </SettingRow>
                      {settings.binauralCrossfeed && (
                        <SettingRow label="Crossfeed Level" description="Amount of crossfeed applied">
                          <Select<string>
                            value={settings.binauralCrossfeedLevel}
                            options={[
                              { value: 'low', label: 'Low' },
                              { value: 'medium', label: 'Medium' },
                              { value: 'high', label: 'High' },
                            ]}
                            onChange={(v) => setSetting('binauralCrossfeedLevel', v)}
                          />
                        </SettingRow>
                      )}
                      <SettingRow label="HRTF Preset" description="Virtual speaker angle for multichannel rendering">
                        <Select<string>
                          value={settings.binauralHrtfPreset}
                          options={[
                            { value: 'intimate', label: 'Intimate (±22°)' },
                            { value: 'studio', label: 'Studio (±30°)' },
                            { value: 'wide', label: 'Wide (±45°)' },
                          ]}
                          onChange={(v) => setSetting('binauralHrtfPreset', v)}
                        />
                      </SettingRow>
                      <SettingRow label="Stereo Width" description="Adjust spatial width">
                        <Toggle checked={settings.binauralWidening} onChange={(v) => setSetting('binauralWidening', v)} />
                      </SettingRow>
                      {settings.binauralWidening && (
                        <SettingRow label="Width Amount" description="0 = mono, 1 = neutral, 2 = wide">
                          <NumberInput value={settings.binauralWidth} onChange={(v) => setSetting('binauralWidth', v)} min={0} max={2} step={0.05} suffix="" />
                        </SettingRow>
                      )}
                    </div>
                  )}
                  <SettingRow label="EQ Studio" description="Multi-mode equalizer with AutoEQ, M/S processing & room correction">
                    <Toggle checked={settings.equalizerEnabled} onChange={(v) => setSetting('equalizerEnabled', v)} />
                  </SettingRow>
                  {settings.equalizerEnabled && <EQStudio />}
                </div>
              )}

              {activeTab === 'downloads' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Download Settings</h2>
                  <SettingRow label="Download Quality" description="Quality for track downloads">
                    <Select<string>
                      value={settings.downloadQuality}
                      options={[
                        { value: 'DOLBY_ATMOS_EAC3_HIGH', label: 'Dolby Atmos — E-AC-3 High' },
                        { value: 'DOLBY_ATMOS_EAC3_LOW', label: 'Dolby Atmos — E-AC-3 Low' },
                        { value: 'DOLBY_ATMOS_AC4_HIGH', label: 'Dolby Atmos — AC-4 High' },
                        { value: 'DOLBY_ATMOS_AC4_LOW', label: 'Dolby Atmos — AC-4 Low' },
                        { value: 'HI_RES_LOSSLESS', label: 'Hi-Res Lossless (24-bit FLAC)' },
                        { value: 'LOSSLESS', label: 'Lossless (16-bit FLAC)' },
                        { value: 'HIGH', label: 'High (320kbps AAC)' },
                        { value: 'LOW', label: 'Low (96kbps AAC)' },
                        { value: 'FFMPEG_OPUS_320', label: 'Opus 320kbps' },
                        { value: 'FFMPEG_OPUS_256', label: 'Opus 256kbps' },
                        { value: 'FFMPEG_OPUS_160', label: 'Opus 160kbps' },
                        { value: 'FFMPEG_OPUS_128', label: 'Opus 128kbps' },
                        { value: 'FFMPEG_OPUS_96', label: 'Opus 96kbps' },
                        { value: 'FFMPEG_AAC_320', label: 'AAC 320kbps' },
                        { value: 'FFMPEG_AAC_256', label: 'AAC 256kbps' },
                        { value: 'FFMPEG_AAC_128', label: 'AAC 128kbps' },
                        { value: 'FFMPEG_MP3_320', label: 'MP3 320kbps' },
                        { value: 'FFMPEG_MP3_256', label: 'MP3 256kbps' },
                        { value: 'FFMPEG_MP3_128', label: 'MP3 128kbps' },
                        { value: 'FFMPEG_OGG_320', label: 'OGG 320kbps' },
                        { value: 'FFMPEG_OGG_256', label: 'OGG 256kbps' },
                        { value: 'FFMPEG_OGG_128', label: 'OGG 128kbps' },
                      ]}
                      onChange={(v) => setSetting('downloadQuality', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Lossless Container" description="Container format for lossless downloads">
                    <Select<string>
                      value={settings.losslessContainer}
                      options={[
                        { value: 'nochange', label: "Don't change" },
                      ]}
                      onChange={(v) => setSetting('losslessContainer', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Bulk Download Method" description="Choose how multiple tracks are downloaded together">
                    <Select<string>
                      value={settings.bulkDownloadMethod}
                      options={[
                        { value: 'zip', label: 'ZIP Archive' },
                        { value: 'folder', label: 'Folder Picker' },
                        { value: 'local', label: 'Local Media Folder' },
                        { value: 'individual', label: 'Individual Files' },
                      ]}
                      onChange={(v) => setSetting('bulkDownloadMethod', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Remember Last Folder" description="Re-use the last chosen directory for Folder Picker downloads">
                    <Toggle checked={settings.rememberLastFolder} onChange={(v) => setSetting('rememberLastFolder', v)} />
                  </SettingRow>
                  <SettingRow label="Single Downloads to Folder" description="Save individual track downloads directly to the configured folder instead of triggering a browser download">
                    <Toggle checked={settings.singleToFolder} onChange={(v) => setSetting('singleToFolder', v)} />
                  </SettingRow>
                  <SettingRow label="Force ZIP as Blob" description="Download ZIP in memory instead of streaming to disk">
                    <Toggle checked={settings.forceZipBlob} onChange={(v) => setSetting('forceZipBlob', v)} />
                  </SettingRow>
                  <SettingRow label="Write Artists Separately" description="Write artists separately to metadata. Requires player support.">
                    <Toggle checked={settings.writeArtistsSeparately} onChange={(v) => setSetting('writeArtistsSeparately', v)} />
                  </SettingRow>
                  <SettingRow label="Download Lyrics" description="Include .lrc files when downloading tracks/albums">
                    <Toggle checked={settings.downloadLyrics} onChange={(v) => setSetting('downloadLyrics', v)} />
                  </SettingRow>
                  <SettingRow label="Romaji Lyrics" description="Convert Japanese lyrics to Romaji (Latin characters)">
                    <Toggle checked={settings.romajiLyrics} onChange={(v) => setSetting('romajiLyrics', v)} />
                  </SettingRow>
                  <SettingRow label="Cover Art Size" description="Size for downloaded/embedded cover art">
                    <input
                      type="text"
                      value={settings.coverArtSize}
                      onChange={(e) => setSetting('coverArtSize', e.target.value)}
                      placeholder="1280x1280"
                      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border focus:ring-1 focus:ring-primary/20 w-32 text-right"
                    />
                  </SettingRow>
                  <SettingRow label="Filename Template" description="Template for downloaded files">
                    <input
                      type="text"
                      value={settings.filenameTemplate}
                      onChange={(e) => setSetting('filenameTemplate', e.target.value)}
                      placeholder="{trackNumber}. {title}"
                      className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border focus:ring-1 focus:ring-primary/20 w-48"
                    />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Appearance</h2>
                  <SettingRow label="Background Image" description="Choose your app wallpaper">
                    <Select<BackgroundImage>
                      value={settings.backgroundImage}
                      options={[
                        { value: 'blue-mountains', label: 'Blue Mountains' },
                        { value: 'cosmic-purple', label: 'Cosmic Purple' },
                        { value: 'dark-forest', label: 'Dark Forest' },
                        { value: 'neon-city', label: 'Neon City' },
                        { value: 'valkyrie', label: 'Valkyrie Forest (Live)' },
                        { value: 'custom', label: 'Custom Upload' },
                        { value: 'none', label: 'None (Solid)' },
                      ]}
                      onChange={(v) => setSetting('backgroundImage', v)}
                    />
                  </SettingRow>
                  {settings.backgroundImage === 'custom' && (
                    <SettingRow label="Custom Media" description="Upload a local image or video">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const isVideo = file.type.startsWith('video/');
                          const type = isVideo ? 'video' : 'image';

                          try {
                            await saveBackgroundData(file, type);
                            if (settings.customBackgroundUrl?.startsWith('blob:')) {
                              URL.revokeObjectURL(settings.customBackgroundUrl);
                            }
                            const newUrl = URL.createObjectURL(file);
                            setSetting('customBackgroundUrl', newUrl);
                            setSetting('customBackgroundType', type as any);
                          } catch (error) {
                            console.error('Failed to save background', error);
                          }
                        }}
                        className="file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs text-muted-foreground w-48"
                      />
                    </SettingRow>
                  )}
                  <SettingRow label="Overlay Opacity" description="Darken overlay on background image">
                    <NumberInput value={settings.backgroundOverlayOpacity} onChange={(v) => setSetting('backgroundOverlayOpacity', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                  <SettingRow label="Background Blur" description="Adjust background blur intensity">
                    <NumberInput value={settings.backgroundBlurAmount ?? 2} onChange={(v) => setSetting('backgroundBlurAmount', v)} min={0} max={100} suffix="px" />
                  </SettingRow>
                  <SettingRow label="Glass Opacity" description="Adjust transparency of UI panels (0% = clear)">
                    <NumberInput value={settings.glassOpacity ?? 10} onChange={(v) => setSetting('glassOpacity', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                  <SettingRow label="Glass Blur" description="Adjust the frosted glass blur effect (0% = clear)">
                    <NumberInput value={settings.glassBlur ?? 30} onChange={(v) => setSetting('glassBlur', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                  <SettingRow label="Background Style" description="Player background effect">
                    <Select<BackgroundStyle>
                      value={settings.backgroundStyle}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'blur', label: 'Album Blur' },
                        { value: 'gradient', label: 'Gradient' },
                        { value: 'solid', label: 'Solid' },
                      ]}
                      onChange={(v) => setSetting('backgroundStyle', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Dynamic Colors" description="Adapt UI colors to album artwork">
                    <Toggle checked={settings.dynamicColors} onChange={(v) => setSetting('dynamicColors', v)} />
                  </SettingRow>
                  <SettingRow label="Quality Badge" description="Show audio quality indicator on tracks">
                    <Toggle checked={settings.showQualityBadge} onChange={(v) => setSetting('showQualityBadge', v)} />
                  </SettingRow>
                  <SettingRow label="Track Date" description="Show release date on tracks">
                    <Toggle checked={settings.showTrackDate} onChange={(v) => setSetting('showTrackDate', v)} />
                  </SettingRow>
                  <SettingRow label="Animated Covers" description="Show video covers for supported albums">
                    <Toggle checked={settings.animatedCovers} onChange={(v) => setSetting('animatedCovers', v)} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'themes' && <ThemePicker />}

              {activeTab === 'nowplaying' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Now Playing</h2>
                  <SettingRow label="Now Playing Style" description="Layout of the now playing view">
                    <Select<NowPlayingStyle>
                      value={settings.nowPlayingStyle}
                      options={[
                        { value: 'default', label: 'Default' },
                        { value: 'fullscreen', label: 'Fullscreen' },
                        { value: 'minimal', label: 'Minimal' },
                      ]}
                      onChange={(v) => setSetting('nowPlayingStyle', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Fullscreen on Cover Click" description="Enter fullscreen when clicking album art">
                    <Toggle checked={settings.fullscreenOnClick} onChange={(v) => setSetting('fullscreenOnClick', v)} />
                  </SettingRow>

                  <div className="mt-6 mb-3">
                    <h3 className="font-display font-semibold text-sm text-primary">Fullscreen Player Appearance</h3>
                  </div>
                  <SettingRow label="Overlay Opacity" description="Darken overlay on fullscreen background">
                    <NumberInput value={settings.fsBackgroundOverlayOpacity ?? 50} onChange={(v) => setSetting('fsBackgroundOverlayOpacity', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                  <SettingRow label="Background Blur" description="Adjust fullscreen background blur intensity">
                    <NumberInput value={settings.fsBackgroundBlurAmount ?? 80} onChange={(v) => setSetting('fsBackgroundBlurAmount', v)} min={0} max={100} suffix="px" />
                  </SettingRow>
                  <SettingRow label="Glass Opacity" description="Adjust background art opacity">
                    <NumberInput value={settings.fsGlassOpacity ?? 40} onChange={(v) => setSetting('fsGlassOpacity', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                  <SettingRow label="Glass Blur" description="Adjust extra frosted glass blur">
                    <NumberInput value={settings.fsGlassBlur ?? 30} onChange={(v) => setSetting('fsGlassBlur', v)} min={0} max={100} suffix="%" />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'lyrics' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Lyrics</h2>
                  <SettingRow label="Enable Lyrics" description="Show lyrics panel option">
                    <Toggle checked={settings.lyricsEnabled} onChange={(v) => setSetting('lyricsEnabled', v)} />
                  </SettingRow>
                  <SettingRow label="Font Size" description="Lyrics text size">
                    <Select<LyricsSize>
                      value={settings.lyricsSize}
                      options={[
                        { value: 'small', label: 'Small' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'large', label: 'Large' },
                      ]}
                      onChange={(v) => setSetting('lyricsSize', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Karaoke Mode" description="Highlight current lyric line in sync">
                    <Toggle checked={settings.karaokeMode} onChange={(v) => setSetting('karaokeMode', v)} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'visualizer' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Visualizer</h2>
                  <SettingRow label="Visualizer Style" description="Audio visualization type">
                    <Select<VisualizerStyle>
                      value={settings.visualizerStyle}
                      options={[
                        { value: 'bars', label: 'Bars' },
                        { value: 'wave', label: 'Wave' },
                        { value: 'circular', label: 'Circular' },
                        { value: 'none', label: 'Disabled' },
                      ]}
                      onChange={(v) => setSetting('visualizerStyle', v)}
                    />
                  </SettingRow>
                  <SettingRow label="Dimming" description="Dim visuals to reduce distraction">
                    <Toggle checked={settings.visualizerDimming} onChange={(v) => setSetting('visualizerDimming', v)} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'sidebar' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Sidebar Sections</h2>
                  <SettingRow label="Recently Played" description="Show recently played section">
                    <Toggle checked={settings.showRecentlyPlayed} onChange={(v) => setSetting('showRecentlyPlayed', v)} />
                  </SettingRow>
                  <SettingRow label="Favorites" description="Show favorites section">
                    <Toggle checked={settings.showFavorites} onChange={(v) => setSetting('showFavorites', v)} />
                  </SettingRow>
                  <SettingRow label="Playlists" description="Show playlists section">
                    <Toggle checked={settings.showPlaylists} onChange={(v) => setSetting('showPlaylists', v)} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div>
                  <h2 className="font-display font-semibold text-base mb-3">Integrations</h2>

                  <div className="glass-card rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Radio size={16} className="text-destructive" />
                      Last.fm Scrobbling
                    </h3>
                    <SettingRow label="Enable Scrobbling" description="Track your listening history on Last.fm">
                      <Toggle checked={lastfm.enabled} onChange={(v) => lastfm.setEnabled(v)} />
                    </SettingRow>

                    {lastfm.sessionKey ? (
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">Connected Account</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Scrobbling as {lastfm.username || 'user'}</p>
                        </div>
                        <button
                          onClick={() => {
                            lastfmClient.clearSession();
                            lastfm.setSessionKey('');
                            lastfm.setUsername('');
                            toast({ title: 'Disconnected from Last.fm' });
                          }}
                          className="px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">Connect Account</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Link your Last.fm account to allow scrobbling</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const { url } = await lastfmClient.getAuthUrl();
                              window.location.href = url;
                            } catch (error) {
                              toast({ title: 'Failed to connect', variant: 'destructive' });
                            }
                          }}
                          className="px-4 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors"
                        >
                          Connect Last.fm
                        </button>
                      </div>
                    )}

                    <SettingRow label="Scrobble At" description="Percentage of track to trigger scrobble">
                      <NumberInput value={lastfm.scrobbleAt} onChange={(v) => lastfm.setScrobbleAt(v)} min={25} max={100} suffix="%" />
                    </SettingRow>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Get your Last.fm API key at{' '}
                    <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      last.fm/api
                    </a>
                  </p>

                  <div className="glass-card rounded-lg p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Headphones size={16} className="text-primary" />
                      ListenBrainz Scrobbling
                    </h3>
                    <SettingRow label="Enable Scrobbling" description="Track your listening history on ListenBrainz">
                      <Toggle checked={listenbrainz.enabled} onChange={(v) => listenbrainz.setEnabled(v)} />
                    </SettingRow>
                    <SettingRow label="User Token" description="Your ListenBrainz user token">
                      <input
                        type="password"
                        value={listenbrainz.userToken}
                        onChange={(e) => listenbrainz.setUserToken(e.target.value)}
                        placeholder="Enter token..."
                        className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-40 focus:ring-1 focus:ring-primary/20"
                      />
                    </SettingRow>
                    <SettingRow label="Username" description="Your ListenBrainz username">
                      <input
                        type="text"
                        value={listenbrainz.username}
                        onChange={(e) => listenbrainz.setUsername(e.target.value)}
                        placeholder="Username"
                        className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-40 focus:ring-1 focus:ring-primary/20"
                      />
                    </SettingRow>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your token at{' '}
                      <a href="https://listenbrainz.org/settings/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        listenbrainz.org/settings
                      </a>
                    </p>
                  </div>

                  <div className="glass-card rounded-lg p-4 mt-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Music size={16} className="text-[#1DB954]" />
                      Spotify Metadata Importer
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      To import Spotify playlists by URL, you must provide a free Spotify Developer API Key to allow the app to fetch the track names from Spotify's servers.
                    </p>
                    <SettingRow label="Client ID" description="Your Spotify App Client ID">
                      <input
                        type="password"
                        value={spotify.clientId}
                        onChange={(e) => spotify.setClientId(e.target.value)}
                        placeholder="Client ID..."
                        className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-48 focus:ring-1 focus:ring-primary/20"
                      />
                    </SettingRow>
                    <SettingRow label="Client Secret" description="Your Spotify App Client Secret">
                      <input
                        type="password"
                        value={spotify.clientSecret}
                        onChange={(e) => spotify.setClientSecret(e.target.value)}
                        placeholder="Client Secret..."
                        className="bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border w-48 focus:ring-1 focus:ring-primary/20"
                      />
                    </SettingRow>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your free API keys at{' '}
                      <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        developer.spotify.com
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'instances' && (
                <InstancesManager />
              )}

              {activeTab === 'data' && (
                <DataManagement />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function DataManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importLibrary(file);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h2 className="font-display font-semibold text-base mb-3">Data Management</h2>
      <p className="text-xs text-muted-foreground mb-4">Export or import your library data for cross-device syncing</p>

      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={exportLibrary}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left"
        >
          <FolderDown size={20} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Export Library</p>
            <p className="text-xs text-muted-foreground">Download favorites, playlists, and settings as JSON</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left"
        >
          <Upload size={20} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Import Library</p>
            <p className="text-xs text-muted-foreground">Merge data from a previously exported JSON file</p>
          </div>
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Tip: Export your library regularly to back up your data. Import merges with existing data.
      </p>
    </div>
  );
}
