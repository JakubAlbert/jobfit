import { describe, expect, it } from 'vitest'
import { anonymize, replaceLiteral } from './anonymize'

const noPersonal = { fullName: '', address: '' }

describe('anonymize: emails and links', () => {
  it('replaces email addresses', () => {
    const { text, counts } = anonymize('Kontakt: jan.kovac+cv@example.co.uk, alebo a@b.sk', noPersonal)
    expect(text).toBe('Kontakt: [EMAIL], alebo [EMAIL]')
    expect(counts.email).toBe(2)
  })

  it('replaces profile links with and without protocol', () => {
    const { text } = anonymize(
      'linkedin.com/in/jan-kovac, https://github.com/jkovac a www.jankovac.dev',
      noPersonal,
    )
    expect(text).toBe('[ODKAZ], [ODKAZ] a [ODKAZ]')
  })
})

describe('anonymize: phone numbers', () => {
  it.each([
    '+421 905 123 456',
    '+421905123456',
    '00421 905 123 456',
    '0905 123 456',
    '0905123456',
    '0905-123-456',
    '+420 777 123 456',
    '02/1234 5678',
  ])('replaces %s', (phone) => {
    expect(anonymize(`Tel.: ${phone}.`, noPersonal).text).toBe('Tel.: [TELEFÓN].')
  })

  it.each([
    '2019 – 2023',
    '2019-2023',
    '05/2020 – 03/2023',
    '01.2019 - 12.2020',
    'React 18, Node 20, TypeScript 5.4',
    'zlepšenie o 30 %',
    'IČO 12345678',
    'verzia 0.12.3',
  ])('keeps non-phone numbers: %s', (text) => {
    expect(anonymize(text, noPersonal).text).toBe(text)
  })
})

describe('anonymize: address', () => {
  it('replaces the entered address and its parts', () => {
    const personal = { fullName: '', address: 'Hlavná 12, 811 01 Bratislava' }
    const { text } = anonymize(
      'Adresa: Hlavná 12, 811 01 Bratislava\nBydlisko: Hlavna 12\n811 01 Bratislava',
      personal,
    )
    expect(text).toBe('Adresa: [ADRESA]\nBydlisko: [ADRESA]\n[ADRESA]')
  })

  it('keeps the city alone, it is not identifying', () => {
    const personal = { fullName: '', address: 'Hlavná 12, 811 01 Bratislava' }
    expect(anonymize('Developer, Acme, Bratislava', personal).text).toBe('Developer, Acme, Bratislava')
  })

  it('replaces any postal code followed by a city even without entered address', () => {
    expect(anonymize('Bydlisko: 040 01 Košice', noPersonal).text).toBe('Bydlisko: [ADRESA]')
  })
})

describe('anonymize: name', () => {
  const personal = { fullName: 'Ján Kováč', address: '' }

  it('replaces the full name regardless of case and diacritics', () => {
    const { text, counts } = anonymize('JÁN KOVÁČ\nŽivotopis: Jan Kovac', personal)
    expect(text).toBe('[MENO]\nŽivotopis: [MENO]')
    expect(counts.name).toBe(2)
  })

  it('replaces first and last name on their own', () => {
    expect(anonymize('Volám sa Ján. p. Kováč', personal).text).toBe('Volám sa [MENO]. p. [MENO]')
  })

  it('does not replace the name inside other words', () => {
    expect(anonymize('Jánošík, Kováčová s.r.o.', personal).text).toBe('Jánošík, Kováčová s.r.o.')
  })
})

describe('anonymize: full CV', () => {
  it('removes all personal data and keeps the rest', () => {
    const cv = [
      'Ján Kováč',
      'Hlavná 12, 811 01 Bratislava | +421 905 123 456 | jan@kovac.sk',
      'linkedin.com/in/jankovac',
      '',
      'Skúsenosti',
      'Frontend Developer, Acme s.r.o., 2021 – 2024',
      'React 18, TypeScript, zrýchlenie načítania o 40 %',
    ].join('\n')

    const { text, counts } = anonymize(cv, { fullName: 'Ján Kováč', address: 'Hlavná 12, 811 01 Bratislava' })

    expect(text).toBe(
      [
        '[MENO]',
        '[ADRESA] | [TELEFÓN] | [EMAIL]',
        '[ODKAZ]',
        '',
        'Skúsenosti',
        'Frontend Developer, Acme s.r.o., 2021 – 2024',
        'React 18, TypeScript, zrýchlenie načítania o 40 %',
      ].join('\n'),
    )
    expect(counts).toEqual({ email: 1, link: 1, address: 1, phone: 1, name: 1 })
  })
})

describe('replaceLiteral', () => {
  it('matches across a line break', () => {
    expect(replaceLiteral('Ján\nKováč', 'Ján Kováč', () => 'X')).toBe('X')
  })

  it('escapes regex characters in the needle', () => {
    expect(replaceLiteral('a (b) c', '(b)', () => 'X')).toBe('a X c')
  })
})
