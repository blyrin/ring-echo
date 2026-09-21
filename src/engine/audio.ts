import { Howl } from 'howler'
import { assetUrl, audioBlobUrl } from './assets'

export interface AudioChannelState {
  file: string
  loop: boolean
}

export type AudioChannel = 'music' | 'sound' | 'voice'

export class AudioEngine {
  private music: Howl | null = null
  private sound: Howl | null = null
  private voice: Howl | null = null
  private musicState: AudioChannelState | null = null
  private soundState: AudioChannelState | null = null
  private voiceSuppressed = false
  private voiceActive = false
  private volumes: Record<AudioChannel, number> = { music: 0.8, sound: 0.9, voice: 1 }

  setVolume(channel: AudioChannel, v: number) {
    this.volumes[channel] = v
    if (channel === 'music') {
      this.music?.volume(v)
    } else if (channel === 'sound') {
      this.sound?.volume(v)
    } else {
      this.voice?.volume(v)
    }
  }

  getVolume(channel: AudioChannel): number {
    return this.volumes[channel]
  }

  playMusic(file: string, loop: boolean, fadein: number) {
    this.stopMusic(0.4)
    const h = new Howl({ src: [audioBlobUrl(file) ?? assetUrl(file)], loop, volume: 0, format: ['ogg'] })
    this.music = h
    this.musicState = { file, loop }
    h.play()
    h.fade(0, this.volumes.music, Math.max(1, fadein * 1000))
  }

  stopMusic(fadeout: number) {
    const h = this.music
    if (!h) {
      return
    }
    this.music = null
    this.musicState = null
    this.release(h, fadeout)
  }

  playSound(file: string, loop: boolean, fadein: number) {
    this.stopSound(0.2)
    const h = new Howl({
      src: [audioBlobUrl(file) ?? assetUrl(file)],
      loop,
      volume: fadein > 0 ? 0 : this.volumes.sound,
      format: ['ogg'],
    })
    this.sound = h
    this.soundState = { file, loop }
    const id = h.play()
    if (fadein > 0) {
      h.fade(0, this.volumes.sound, fadein * 1000)
    }
    if (!loop) {
      h.once('end', () => h.unload())
    }
    return id
  }

  stopSound(fadeout: number) {
    const h = this.sound
    if (!h) {
      return
    }
    this.sound = null
    this.soundState = null
    this.release(h, fadeout)
  }

  playVoice(file: string) {
    this.stopVoice(0)
    if (this.voiceSuppressed || this.volumes.voice <= 0) {
      return
    }
    const h = new Howl(
      { src: [audioBlobUrl(file) ?? assetUrl(file)], volume: this.volumes.voice, format: ['ogg'], html5: true })
    h.once('end', () => {
      h.unload()
      this.clearVoice(h)
    })
    h.once('loaderror', () => {
      h.unload()
      this.clearVoice(h)
    })
    h.once('playerror', () => {
      h.unload()
      this.clearVoice(h)
    })
    this.voice = h
    this.voiceActive = true
    h.play()
  }

  stopVoice(fadeout: number) {
    const h = this.voice
    if (!h) {
      return
    }
    this.clearVoice(h)
    this.release(h, fadeout)
  }

  isVoicePlaying(): boolean {
    return this.voiceActive
  }

  setVoiceSuppressed(suppressed: boolean) {
    if (this.voiceSuppressed === suppressed) {
      return
    }
    this.voiceSuppressed = suppressed
    if (suppressed) {
      this.stopVoice(0.1)
    }
  }

  private clearVoice(h: Howl) {
    if (this.voice !== h) {
      return
    }
    this.voice = null
    this.voiceActive = false
  }

  stopAll() {
    this.stopMusic(0)
    this.stopSound(0)
    this.stopVoice(0)
  }

  serialize(): { music: AudioChannelState | null; sound: AudioChannelState | null } {
    return {
      music: this.musicState ? { ...this.musicState } : null,
      sound: this.soundState ? { ...this.soundState } : null,
    }
  }

  restore(state: { music: AudioChannelState | null; sound: AudioChannelState | null } | null) {
    this.stopAll()
    if (!state) {
      return
    }
    if (state.music) {
      this.playMusic(state.music.file, state.music.loop, 0.8)
    }
    if (state.sound) {
      this.playSound(state.sound.file, state.sound.loop, state.sound.loop ? 0.8 : 0)
    }
  }

  private release(h: Howl, fadeout: number) {
    if (fadeout > 0) {
      h.fade(h.volume(), 0, fadeout * 1000)
      window.setTimeout(() => h.unload(), fadeout * 1000 + 150)
    } else {
      h.stop()
      h.unload()
    }
  }
}
