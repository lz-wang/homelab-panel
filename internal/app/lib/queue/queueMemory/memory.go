package queueMemory

import (
	"encoding/json"
	"errors"
	"reflect"
	"sync"
)

type Pool struct {
	Values [][]byte
	Lock   sync.RWMutex
}

func New() *Pool {
	return &Pool{}
}

func (k *Pool) LPush(value ...interface{}) error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	for i := 0; i < len(value); i++ {
		v, err := json.Marshal(value[i])
		if err != nil {
			return err
		}
		k.Values = append([][]byte{v}, k.Values...)
	}
	return nil
}

func (k *Pool) RPush(value ...interface{}) error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	for i := 0; i < len(value); i++ {
		v, err := json.Marshal(value[i])
		if err != nil {
			return err
		}
		k.Values = append(k.Values, v)
	}
	return nil
}

func (k *Pool) Delete(value interface{}) error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	target, err := json.Marshal(value)
	if err != nil {
		return err
	}

	for i, item := range k.Values {
		if reflect.DeepEqual(item, target) {
			k.Values = append(k.Values[:i], k.Values[i+1:]...)
			return nil
		}
	}

	return nil
}

// 取出值
func (k *Pool) GetByIndex(index int64, v interface{}) error {
	k.Lock.RLock()
	defer k.Lock.RUnlock()
	// index 等于长度时也会越界，必须严格小于
	if index < 0 || index >= int64(len(k.Values)) {
		return errors.New("index non-existent")
	}
	if err := json.Unmarshal(k.Values[index], v); err != nil {
		return err
	}
	return nil
}

// 左-取出并删除
func (k *Pool) LPop(v interface{}) error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	if len(k.Values) == 0 {
		return errors.New("index non-existent")
	}
	// 读取与删除在同一把写锁内完成，避免 TOCTOU 竞争删错元素
	if err := json.Unmarshal(k.Values[0], v); err != nil {
		return err
	}
	k.Values = k.Values[1:]
	return nil
}

// 右-取出并删除
func (k *Pool) RPop(v interface{}) error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	n := len(k.Values)
	if n == 0 {
		return errors.New("index non-existent")
	}
	// 读取与删除在同一把写锁内完成，避免 TOCTOU 竞争删错元素
	if err := json.Unmarshal(k.Values[n-1], v); err != nil {
		return err
	}
	k.Values = k.Values[:n-1]
	return nil
}

func (k *Pool) Length() (int64, error) {
	k.Lock.RLock()
	defer k.Lock.RUnlock()
	return int64(len(k.Values)), nil
}

func (k *Pool) Flush() error {
	k.Lock.Lock()
	defer k.Lock.Unlock()
	k.Values = nil
	return nil
}
