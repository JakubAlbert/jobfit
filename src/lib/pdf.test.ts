import { describe, expect, it } from 'vitest'
import { joinPdfText, type TextPiece } from './pdf'

const piece = (str: string, hasEOL = false): TextPiece => ({ str, hasEOL })

describe('joinPdfText', () => {
  it('builds lines from text items and their end-of-line markers', () => {
    const page = [piece('Frontend'), piece(' '), piece('Developer', true), piece('Acme s.r.o.', true)]
    expect(joinPdfText([page])).toBe('Frontend Developer\nAcme s.r.o.')
  })

  it('collapses repeated spaces and trims lines', () => {
    const page = [piece('  React,   TypeScript  ', true), piece('\tNode.js', true)]
    expect(joinPdfText([page])).toBe('React, TypeScript\nNode.js')
  })

  it('separates pages with a blank line and drops empty pages', () => {
    const pages = [[piece('Strana 1', true)], [], [piece(' ', true)], [piece('Strana 2', true)]]
    expect(joinPdfText(pages)).toBe('Strana 1\n\nStrana 2')
  })

  it('keeps at most one blank line in a row', () => {
    const page = [piece('A', true), piece('', true), piece('', true), piece('', true), piece('B')]
    expect(joinPdfText([page])).toBe('A\n\nB')
  })
})
