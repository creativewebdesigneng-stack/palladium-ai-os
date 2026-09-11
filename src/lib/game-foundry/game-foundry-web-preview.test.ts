import { describe, expect, it } from 'vitest'
import { buildGameFoundryWebPreviewDocument } from './game-foundry-web-preview'

describe('Game Foundry web preview',()=>{
  it('assembles index.html, CSS and JS into a sandboxable document',()=>{
    const html=buildGameFoundryWebPreviewDocument({files:[
      {path:'index.html',content:'<!doctype html><html><head></head><body><canvas id="game"></canvas></body></html>'},
      {path:'style.css',content:'body{margin:0}'},
      {path:'game.js',content:'document.body.dataset.ready="yes"'},
    ]})
    expect(html).toContain('Content-Security-Policy')
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain('<style>')
    expect(html).toContain('document.body.dataset.ready')
  })
  it('requires index.html',()=>{
    expect(()=>buildGameFoundryWebPreviewDocument({files:[{path:'game.js',content:'1'}]})).toThrow('index.html')
  })
  it('neutralises embedded closing script/style sequences from generated files',()=>{
    const html=buildGameFoundryWebPreviewDocument({files:[
      {path:'index.html',content:'<html><head></head><body></body></html>'},
      {path:'game.js',content:'console.log("x")</script><img src=x>'},
      {path:'style.css',content:'body{color:red}</style><script>alert(1)</script>'},
    ]})
    expect(html).toContain('<\\/script>')
    expect(html).toContain('<\\/style>')
  })
})
