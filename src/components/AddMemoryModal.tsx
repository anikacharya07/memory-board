import React, { useState } from 'react';
import type { MemoryNode, AudioPresetType, MediaType } from '../types';
import { X, Upload, Music, Sparkles } from 'lucide-react';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newMemory: Omit<MemoryNode, 'id' | 'x' | 'y' | 'rotation' | 'width' | 'height' | 'connectedTo'>) => void;
}

const PRESET_IMAGES = [
  { label: 'golden sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800' },
  { label: 'fairytale woods', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800' },
  { label: 'cozy coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800' },
  { label: 'stargazing', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800' },
  { label: 'city lights', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=800' },
];

const AUDIO_PRESETS: { id: AudioPresetType; label: string; desc: string }[] = [
  { id: 'acoustic_guitar', label: 'acoustic guitar', desc: 'warm fingerstyle plucks' },
  { id: 'music_box', label: 'music box', desc: 'delicate nostalgic lullaby' },
  { id: 'lofi_piano', label: 'lofi rhodes', desc: 'warm mellow jazz chords' },
  { id: 'sunset_chords', label: 'sunset synth', desc: 'lush golden hour pads' },
  { id: 'rain_ambient', label: 'rain & chimes', desc: 'gentle raindrops & bells' },
  { id: 'starlight_pads', label: 'starlight ambient', desc: 'ethereal dreamy shimmer' },
];

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [mediaUrl, setMediaUrl] = useState(PRESET_IMAGES[0].url);
  const [audioPreset, setAudioPreset] = useState<AudioPresetType>('acoustic_guitar');
  const [customAudioUrl, setCustomAudioUrl] = useState<string | undefined>(undefined);
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomAudioName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAudioUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || !mediaUrl) return;

    onAdd({
      caption: caption.trim().toLowerCase(),
      mediaType,
      mediaUrl,
      audioPreset: customAudioUrl ? undefined : audioPreset,
      audioUrl: customAudioUrl,
      note: note.trim() || undefined,
      date: date.trim() || undefined,
    });

    onClose();
    // Reset
    setCaption('');
    setNote('');
    setDate('');
    setCustomAudioUrl(undefined);
    setCustomAudioName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl border border-neutral-100 p-4 sm:p-6 md:p-8 overflow-hidden max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-sm sm:text-base font-medium tracking-tight text-neutral-800">
              add a memory
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
              pin another moment to the constellation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Caption */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5 lowercase">
              caption (lowercase)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. coffee in the rain, road trip, in love"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300/60 transition-all lowercase"
            />
          </div>

          {/* Media (Upload or Presets) */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5 lowercase">
              memory photo or video
            </label>

            {/* Media Preview & Upload */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-28 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 relative group shadow-sm">
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-neutral-300 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 hover:border-pink-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span>upload photo or video</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_IMAGES.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setMediaType('image');
                        setMediaUrl(preset.url);
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        mediaUrl === preset.url
                          ? 'border-pink-400 bg-pink-50 text-pink-700'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sound / Music Theme */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5 lowercase">
              soundtrack (plays on hover)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUDIO_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCustomAudioUrl(undefined);
                    setCustomAudioName('');
                    setAudioPreset(preset.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    !customAudioUrl && audioPreset === preset.id
                      ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-300 text-pink-900'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <p className="text-xs font-medium lowercase">{preset.label}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{preset.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom Audio Upload Option */}
            <div className="mt-2.5">
              <label className="flex items-center justify-between px-3 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer">
                <span className="flex items-center gap-1.5 truncate">
                  <Music className="w-3.5 h-3.5 text-pink-500" />
                  {customAudioName ? (
                    <span className="text-pink-600 font-medium truncate">{customAudioName}</span>
                  ) : (
                    <span>or upload custom mp3 / audio file</span>
                  )}
                </span>
                <span className="text-[10px] text-pink-500 underline font-medium">Browse</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Romantic Note & Date (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1 lowercase">
                date (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. October 14"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300/60"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1 lowercase">
                romantic note (optional)
              </label>
              <input
                type="text"
                placeholder="a sweet detail about this memory..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300/60"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!caption.trim() || !mediaUrl}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none rounded-full shadow-sm hover:shadow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>pin to board</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
