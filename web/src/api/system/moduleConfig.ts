export function getByName<T>(name: string) {
  return Promise.resolve({
    code: -3,
    msg: `后端暂未提供模块配置接口：${name}`,
    data: null as T | null,
  })
}

export function save<T>(name: string, value: T) {
  return Promise.resolve({
    code: -3,
    msg: `后端暂未提供模块配置接口：${name}`,
    data: value as unknown as void,
  })
}
