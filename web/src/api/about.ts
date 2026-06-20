import { get } from '@/api/request'

export interface AboutDep {
    name: string
    url: string
}

export interface AboutInfo {
    name: string
    version: string
    repo: string
    author: AboutDep
    backend_deps: AboutDep[]
}

export function getAbout() {
    return get<AboutInfo>({ url: '/about' })
}
