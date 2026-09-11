import { describe, expect, it } from 'vitest'
import { cinemaSegmentDurations } from './cinema-render.functions'

describe('Cinema shot segmentation',()=>{
  it('uses only durations supported by the existing LTX worker',()=>{
    for(const total of [1,3,5,8,10,12,17,24,30]){
      const segments=cinemaSegmentDurations(total)
      expect(segments.length).toBeGreaterThan(0)
      expect(segments.every(value=>[3,5,8,10].includes(value))).toBe(true)
      expect(segments.every(value=>value<=10)).toBe(true)
    }
  })
  it('splits a 30 second shot into bounded clips',()=>{
    expect(cinemaSegmentDurations(30)).toEqual([10,10,10])
  })
  it('never expands beyond ten video segments for one shot',()=>{
    expect(cinemaSegmentDurations(30).length).toBeLessThanOrEqual(10)
  })
})
