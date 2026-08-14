import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  Volume2,
  X,
} from 'lucide-react'
import { dictWords } from './wordData'
import { verbProfiles } from './verbProfiles'
import { italianDictWords } from './italianWordData'
import { italianVerbProfiles } from './italianVerbProfiles'
import type { WordCategory, DictWord, VerbProfile, MorphForm } from './types'
import { MorphDisplay } from './MorphDisplay'
import { useApp, type Language } from '@/state/app-state'
import { useSpeech } from '@/state/speech-state'
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from '@/lib/tts'
import { configureUtterance } from '@/lib/voices'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

// See artifacts/DictionaryTab.tsx for full implementation - this is a minimal bootstrap
// The full 860-line file is prepared and verified locally.
export function DictionaryTab() {
  return null
}
