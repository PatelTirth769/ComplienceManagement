import type { ActRule } from '../services/api';

const ACT_ID_ALIASES: Record<string, string> = {
  // CLRA
  'cl act': 'act-clra',
  'cl act / mw act': 'act-clra',
  'clra': 'act-clra',
  'clra act': 'act-clra',
  'contract labour': 'act-clra',

  // S&E
  's&e act': 'act-se',
  'se act': 'act-se',
  'shops and commercial': 'act-se',
  'shops & commercial': 'act-se',
  'shops & establishment': 'act-se',

  // MW
  'min wages': 'act-mw',
  'minimum wages': 'act-mw',
  'mw act': 'act-mw',
  'minimum wages act': 'act-mw',

  // LWF
  'lwf': 'act-lwf',
  'lwf act': 'act-lwf',
  'labour welfare fund': 'act-lwf',

  // PoB
  'bonus act': 'act-pob',
  'pob act': 'act-pob',
  'payment of bonus': 'act-pob',

  // PoW
  'payment of wages act': 'act-pow',
  'pow act': 'act-pow',
  'payment of wages': 'act-pow',

  // EPF / PF
  'pf act': 'act-epf',
  'pf act / edli': 'act-epf',
  'epf act': 'act-epf',
  'provident fund': 'act-epf',
  'epf': 'act-epf',
  'edli': 'act-epf',

  // ESI
  'esi act': 'act-esi',
  'esic': 'act-esi',
  'esi': 'act-esi',
  'employees state insurance': 'act-esi',

  // PT / Pr. Tax
  'pr. tax': 'act-pt',
  'pr tax': 'act-pt',
  'pt act': 'act-pt',
  'professional tax': 'act-pt',

  // PSRGA / PSARA
  'psrga': 'act-psara',
  'psara': 'act-psara',
  'psara act': 'act-psara',
  'psrga act': 'act-psara',
  'private security agencies': 'act-psara',

  // Maternity Benefit
  'mb act': 'act-mb',
  'maternity benefit': 'act-mb',

  // Employment Exchange
  'emp. exc. act': 'act-emp-exc',
  'emp exc act': 'act-emp-exc',
  'employment exchanges': 'act-emp-exc',

  // Child Labour
  'cl (p&r) act': 'act-clpr',
  'cl pr act': 'act-clpr',
  'child labour': 'act-clpr',

  // POSH
  'posh act': 'act-posh',
  'shww / posh act': 'act-posh',
  'posh': 'act-posh',
  'sexual harassment': 'act-posh',

  // Equal Remuneration
  'er act': 'act-er',
  'equal remuneration': 'act-er',

  // Employees Compensation / Workmen Compensation
  'ec act': 'act-ec',
  'employees compensation': 'act-ec',
  'workmen compensation': 'act-ec',

  // National & Festival Holidays
  'n&f act': 'act-nf',
  'nf act': 'act-nf',
  'national and festival': 'act-nf',

  // House Rent Allowance
  'hra act': 'act-hra',
  'house rent allowance': 'act-hra',

  // Factories Act
  'factories act': 'act-factories',
  'factory act': 'act-factories'
};

const cleanAlphaNum = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Finds the matching ActRule for a given checklist item or category name.
 */
export function findActRule(catOrItem: any, actRules: ActRule[] | null | undefined): ActRule | null {
  if (!catOrItem || !actRules || !Array.isArray(actRules) || actRules.length === 0) {
    return null;
  }

  const catName = typeof catOrItem === 'string'
    ? catOrItem
    : (catOrItem.type || catOrItem.category || catOrItem.section || catOrItem.labourCode || catOrItem.actNameInShort || '');

  const rawType = (catName || '').trim().toLowerCase();
  const rawShort = (typeof catOrItem === 'object' ? (catOrItem.actNameInShort || catOrItem['Act Name in Short'] || '') : '').trim().toLowerCase();
  const rawTitle = (typeof catOrItem === 'object' ? (catOrItem.title || catOrItem.particulars || '') : '').trim().toLowerCase();
  const rawActName = (typeof catOrItem === 'object' ? (catOrItem.nameOfAct || catOrItem['Name of the Act'] || '') : '').trim().toLowerCase();

  // 1. Direct Alias dictionary lookup (highest accuracy)
  const targetId = ACT_ID_ALIASES[rawType] || ACT_ID_ALIASES[rawShort];
  if (targetId) {
    const matched = actRules.find(r => r.id && r.id.toLowerCase() === targetId);
    if (matched) return matched;
  }

  // 2. Direct exact or prefix match on shortName
  let match = actRules.find(r => {
    const s = (r.shortName || '').trim().toLowerCase();
    if (!s) return false;
    return s === rawType || s === rawShort || rawType.startsWith(s) || (rawTitle && rawTitle.startsWith(s));
  });
  if (match) return match;

  // 3. Clean alphanumeric matching (handles punctuation, spacing differences)
  const cleanType = cleanAlphaNum(rawType);
  const cleanShort = cleanAlphaNum(rawShort);
  const cleanAct = cleanAlphaNum(rawActName);

  if (cleanType || cleanShort) {
    match = actRules.find(r => {
      const cleanRuleShort = cleanAlphaNum(r.shortName || '');
      const cleanRuleAct = cleanAlphaNum(r.actName || '');

      if (cleanRuleShort && (cleanRuleShort === cleanType || cleanRuleShort === cleanShort)) return true;
      if (cleanRuleAct && (cleanRuleAct === cleanType || cleanRuleAct === cleanAct)) return true;
      
      // Strict contains: only if token is at least 4 characters to avoid false positive short substrings
      if (cleanType.length >= 4 && cleanRuleAct.includes(cleanType)) return true;
      if (cleanShort.length >= 4 && cleanRuleAct.includes(cleanShort)) return true;
      if (cleanAct.length >= 4 && cleanRuleAct.includes(cleanAct)) return true;

      return false;
    });
    if (match) return match;
  }

  // 4. Substring in title
  if (rawTitle) {
    match = actRules.find(r => {
      const s = (r.shortName || '').trim().toLowerCase();
      return s.length >= 3 && rawTitle.includes(s);
    });
    if (match) return match;
  }

  return null;
}

/**
 * Returns a descriptive placeholder ActRule when an item (like 'Other' or general checklist)
 * has no statutory law rule assigned, so the modal displays meaningful guidance rather than blank fields.
 */
export function getDisplayLaw(catOrItem: any, matchedLaw: ActRule | null): ActRule {
  if (matchedLaw) return matchedLaw;

  const name = typeof catOrItem === 'string'
    ? catOrItem
    : (catOrItem.category || catOrItem.type || 'General Checklist Item');

  const isOther = name.toLowerCase().includes('other');

  return {
    id: `ACT-FALLBACK-${cleanAlphaNum(name)}`,
    shortName: name,
    actName: isOther ? 'Non-Statutory / General Compliance' : `${name} (General Statutory Guidance)`,
    category: isOther ? 'General & Company Verification' : 'Statutory Act Law',
    description: isOther
      ? 'This item covers general company verification, agreements, and site-level records. There is no statutory Act or Law rule applicable for this item.'
      : 'No statutory law description has been configured for this Act in the Admin Rules module yet. Admin can set rules in the Admin Rules module.',
    states: ['All States'],
    formsCount: 0
  };
}

/**
 * Downloads an attached Act rule file directly to the client machine.
 */
export function downloadActRuleAttachment(attachment: { fileName?: string; fileData?: string; fileUrl?: string } | null | undefined): boolean {
  if (!attachment) return false;
  const href = attachment.fileData || attachment.fileUrl;
  if (!href) return false;
  try {
    const link = document.createElement('a');
    link.href = href;
    link.download = attachment.fileName || 'Act_Rule_Attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to download rule attachment:', err);
    return false;
  }
}

/**
 * Handles clicking the Law button:
 * - If admin wrote text in that box, opens the modal as it currently does.
 * - If admin attached a file and did not write anything, direct file download is triggered.
 * - If neither, opens modal to show default guidance.
 */
export function handleLawButtonClick(
  matchedLaw: ActRule | null,
  onOpenModal: () => void
): void {
  const hasDescription = Boolean(matchedLaw?.description && matchedLaw.description.trim().length > 0);
  const att = matchedLaw?.attachment;
  const hasAttachment = Boolean(att && (att.fileData || (att as any).fileUrl));

  if (!hasDescription && hasAttachment) {
    downloadActRuleAttachment(att);
    return;
  }

  onOpenModal();
}

