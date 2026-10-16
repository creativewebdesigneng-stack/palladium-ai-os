import {describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const chain={middleware:()=>chain,inputValidator:()=>chain,handler:(fn:unknown)=>fn};return chain;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
import {mp4DurationSeconds} from '../trusted-media.functions';
import {joinMp4Bytes,mp4BoxFixture,mp4Fixture} from './mp4-fixtures';
describe('bounded trusted MP4 container metadata',()=>{
 it.each([0,1])('reads the declared movie duration for mvhd version %s',version=>{expect(mp4DurationSeconds(mp4Fixture({version}))).toBe(2);});
 it('supports movie metadata after media data',()=>{expect(mp4DurationSeconds(mp4Fixture({movieAtEnd:true}))).toBe(2);});
 it('supports metadata in the tail only at the declared top-level box boundary',()=>{
  const file=mp4Fixture({movieAtEnd:true,mediaBytes:200}),prefix=file.subarray(0,64),offset=file.length-200;
  expect(mp4DurationSeconds(prefix,file.length)).toBeNull();expect(mp4DurationSeconds(prefix,file.length,{bytes:file.subarray(offset),offset})).toBe(2);
 });
 it('rejects audio-only containers',()=>{expect(mp4DurationSeconds(mp4Fixture({handler:'soun'}))).toBeNull();});
 it('uses the complete tail box when its header overlaps the first range',()=>{
  const original=mp4Fixture(),file=joinMp4Bytes(original.subarray(0,24),mp4BoxFixture('free',new Uint8Array(24)),original.subarray(24)),offset=40;
  expect(mp4DurationSeconds(file.subarray(0,64),file.length,{bytes:file.subarray(offset),offset})).toBe(2);
 });
 it('rejects unsupported movie header versions',()=>{expect(mp4DurationSeconds(mp4Fixture({version:2}))).toBeNull();});
 it('rejects a truncated top-level box',()=>{const file=mp4Fixture();expect(mp4DurationSeconds(file.subarray(0,file.length-1))).toBeNull();});
 it('rejects unsupported file brands',()=>{
  const file=mp4Fixture();for(const at of [8,16,20])file.set([120,120,120,120],at);expect(mp4DurationSeconds(file)).toBeNull();
 });
 it('rejects movie signatures hidden inside media payload',()=>{
  const file=mp4Fixture(),movieSize=new DataView(file.buffer).getUint32(24),movie=file.subarray(24,24+movieSize);
  expect(mp4DurationSeconds(joinMp4Bytes(file.subarray(0,24),mp4BoxFixture('mdat',movie)))).toBeNull();
 });
 it('rejects duplicate movie headers',()=>{
  const file=mp4Fixture(),movieSize=new DataView(file.buffer).getUint32(24),movie=file.subarray(24,24+movieSize);
  expect(mp4DurationSeconds(joinMp4Bytes(file.subarray(0,24),movie,movie,file.subarray(24+movieSize)))).toBeNull();
 });
 it('supports extended-size top-level media boxes',()=>{
  const file=mp4Fixture(),movieSize=new DataView(file.buffer).getUint32(24),end=24+movieSize,extended=new Uint8Array(48),view=new DataView(extended.buffer);
  view.setUint32(0,1);extended.set([109,100,97,116],4);view.setBigUint64(8,48n);
  expect(mp4DurationSeconds(joinMp4Bytes(file.subarray(0,end),extended))).toBe(2);
 });
 it('rejects unsafe extended box lengths',()=>{
  const bytes=new Uint8Array(16),view=new DataView(bytes.buffer);view.setUint32(0,1);bytes.set([102,116,121,112],4);view.setBigUint64(8,2n**63n);expect(mp4DurationSeconds(bytes)).toBeNull();
 });
 it('rejects a tail whose offsets do not match the storage size',()=>{const file=mp4Fixture();expect(mp4DurationSeconds(file.subarray(0,24),file.length,{bytes:file.subarray(24),offset:25})).toBeNull();});
});
