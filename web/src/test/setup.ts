import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import '@testing-library/jest-dom/vitest'

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

afterEach(() => {
    cleanup()
})
