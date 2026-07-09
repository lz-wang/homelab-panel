import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import '@testing-library/jest-dom/vitest'

import { useLocaleStore } from '@/store/locale'

const store = new Map<string, string>()
const localStorageMock: Storage = {
    get length() {
        return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value),
}

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
})

beforeEach(() => {
    // Default UI language for tests is Chinese (the app's primary language),
    // so assertions on Chinese strings stay valid regardless of the jsdom
    // navigator.language value.
    useLocaleStore.setState({ lang: 'zh-CN' })
})

afterEach(() => {
    cleanup()
})
