import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Convertit les fichiers XML de la table Ciqual en deux CSV :
// - data/ciqual-nutrients.csv : les nutriments (code, nom, unité) ;
// - data/ciqual.csv : un aliment par ligne, une colonne par nutriment (valeur pour 100 g).
// Usage : npm run ciqual:build -- <dossier contenant alim_*.xml, alim_grp_*.xml, const_*.xml et compo_*.xml>
// Fichiers : https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY

const sourceDir = process.argv[2]
if (!sourceDir) {
  throw new Error('Indiquez le dossier des fichiers XML Ciqual : npm run ciqual:build -- <dossier>')
}

async function readXml(prefix: string) {
  // Les fichiers sont datés : alim_2025_11_03.xml, alim_grp_2025_11_03.xml…
  const pattern = new RegExp(`^${prefix}_\\d.*\\.xml$`)
  const file = (await readdir(sourceDir)).find((name) => pattern.test(name))
  if (!file) throw new Error(`Fichier ${prefix}_*.xml introuvable dans ${sourceDir}`)
  return readFile(join(sourceDir, file), 'utf8')
}

function records(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')), ([, body]) => {
    const fields: Record<string, string> = {}
    for (const [, name, value] of body.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)) {
      fields[name] = decodeEntities(value.trim())
    }
    return fields
  })
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

// « 22,1 » → 22.1 ; « < 0,5 » → <0.5 ; « traces » inchangé ; « - » (valeur inconnue) → vide.
function normalizeAmount(value: string | undefined) {
  if (value === undefined || value === '-') return ''
  if (value === 'traces') return value
  const normalized = value.replace(',', '.').replace(/^<\s*/, '<')
  if (!/^<?\d+(\.\d+)?$/.test(normalized)) throw new Error(`Valeur inattendue : « ${value} »`)
  return normalized
}

// « Fer (mg/100 g) » → nom « Fer », unité « mg ».
function splitNutrientLabel(label: string) {
  const match = label.match(/^(.*) \(([^()]+)\/100 ?g\)$/)
  if (!match) throw new Error(`Unité introuvable dans « ${label} »`)
  return { name: match[1], unit: match[2] }
}

const csvField = (value: string) => `"${value.replace(/"/g, '""')}"`
const toCsv = (lines: string[][]) => lines.map((line) => line.map(csvField).join(',')).join('\n') + '\n'

async function build() {
  const [alimXml, groupXml, constXml, compoXml] = await Promise.all(
    ['alim', 'alim_grp', 'const', 'compo'].map(readXml),
  )

  const nutrients = records(constXml, 'CONST').map((nutrient) => ({
    code: nutrient.const_code,
    ...splitNutrientLabel(nutrient.const_nom_fr),
  }))
  nutrients.sort((a, b) => Number(a.code) - Number(b.code))

  const groupNames = new Map<string, string>()
  for (const group of records(groupXml, 'ALIM_GRP')) {
    groupNames.set(group.alim_grp_code, group.alim_grp_nom_fr)
    groupNames.set(group.alim_ssgrp_code, group.alim_ssgrp_nom_fr)
  }
  const category = (code: string) => {
    const name = groupNames.get(code)
    return name && name !== '-' ? name : undefined
  }

  // Clé : « code aliment:code nutriment ».
  const amounts = new Map<string, string>()
  for (const compo of records(compoXml, 'COMPO')) {
    amounts.set(`${compo.alim_code}:${compo.const_code}`, compo.teneur)
  }

  const rows = records(alimXml, 'ALIM').map((food) => [
    food.alim_code,
    food.alim_nom_fr,
    category(food.alim_ssgrp_code) ?? category(food.alim_grp_code) ?? '',
    ...nutrients.map((nutrient) => normalizeAmount(amounts.get(`${food.alim_code}:${nutrient.code}`))),
  ])
  rows.sort((a, b) => Number(a[0]) - Number(b[0]))

  const header = ['ciqual_code', 'name', 'category', ...nutrients.map((nutrient) => nutrient.code)]
  await writeFile(new URL('../data/ciqual.csv', import.meta.url), toCsv([header, ...rows]))
  await writeFile(
    new URL('../data/ciqual-nutrients.csv', import.meta.url),
    toCsv([['code', 'name', 'unit'], ...nutrients.map(({ code, name, unit }) => [code, name, unit])]),
  )
  console.log(`${rows.length} aliments et ${nutrients.length} nutriments écrits dans data/`)
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
