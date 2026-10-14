/**
 * Custom ValidationError class for structured error throwing.
 */
class ValidationError extends Error {
  constructor(message, itemId = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.itemId = itemId;
  }
}

/**
 * Validates responses against the checklist and calculates compliance score.
 * 
 * @param {Array<Object>} checklist - List of valid checklist items.
 * @param {Array<Object>} responses - List of auditor responses.
 * @returns {Object} Score calculation result.
 */
function calculateComplianceScore(checklist, responses) {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    throw new ValidationError('Checklist is empty or invalid.');
  }

  if (!Array.isArray(responses)) {
    throw new ValidationError('Responses must be an array.');
  }

  const checklistMap = new Map();
  checklist.forEach(item => {
    checklistMap.set(item.id, item);
  });

  const responseMap = new Map();
  const seenItemIds = new Set();

  for (const resp of responses) {
    if (!resp || typeof resp !== 'object') {
      throw new ValidationError('Invalid response format.');
    }

    const { itemId, status, remarks } = resp;

    if (!itemId || typeof itemId !== 'string') {
      throw new ValidationError('Response itemId is required.');
    }

    if (seenItemIds.has(itemId)) {
      throw new ValidationError(`Duplicate response found for item ID: ${itemId}`, itemId);
    }
    seenItemIds.add(itemId);

    if (!checklistMap.has(itemId)) {
      throw new ValidationError(`Invalid item ID: ${itemId} does not exist in checklist.`, itemId);
    }

    const validStatuses = ['COMPLIANT', 'NON_COMPLIANT', 'NA'];
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError(
        `Invalid status '${status}' for item ID: ${itemId}. Allowed statuses are: ${validStatuses.join(', ')}`,
        itemId
      );
    }

    if (status === 'NON_COMPLIANT') {
      if (!remarks || typeof remarks !== 'string' || remarks.trim() === '') {
        throw new ValidationError(
          'Remarks are required for non-compliant items.',
          itemId
        );
      }
    }

    responseMap.set(itemId, {
      itemId,
      status,
      remarks: remarks ? remarks.trim() : ''
    });
  }

  // Ensure all items in checklist are responded to
  for (const item of checklist) {
    if (!responseMap.has(item.id)) {
      throw new ValidationError(`Missing response for checklist item ID: ${item.id}`, item.id);
    }
  }

  // Initialize summary counters
  let compliantItems = 0;
  let nonCompliantItems = 0;
  let naItems = 0;

  const nonCompliantDetails = [];
  const categoryMap = new Map();

  for (const item of checklist) {
    const category = item.type || 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        totalItems: 0,
        compliantItems: 0,
        nonCompliantItems: 0,
        naItems: 0,
        applicableItems: 0,
        items: []
      });
    }

    const catData = categoryMap.get(category);
    catData.totalItems += 1;

    const resp = responseMap.get(item.id);
    const status = resp.status;

    if (status === 'COMPLIANT') {
      compliantItems += 1;
      catData.compliantItems += 1;
    } else if (status === 'NON_COMPLIANT') {
      nonCompliantItems += 1;
      catData.nonCompliantItems += 1;

      nonCompliantDetails.push({
        itemId: item.id,
        serialNumber: item.serialNumber,
        type: item.type,
        title: item.title,
        particulars: item.particulars || item.statutoryRequirement,
        remarks: resp.remarks
      });
    } else if (status === 'NA') {
      naItems += 1;
      catData.naItems += 1;
    }

    catData.items.push({
      itemId: item.id,
      title: item.title,
      status: status,
      remarks: resp.remarks
    });
  }

  const totalItems = checklist.length;
  const applicableItems = compliantItems + nonCompliantItems;

  let overallScore = null;
  let overallScoreDisplay = 'N/A';
  let message;

  if (applicableItems > 0) {
    const rawScore = (compliantItems / applicableItems) * 100;
    overallScore = rawScore;
    overallScoreDisplay = `${rawScore.toFixed(2)}%`;
  } else {
    message = 'No applicable compliance items have been assessed.';
  }

  // Category scores
  const categoryScores = [];
  categoryMap.forEach((catData, categoryName) => {
    const catApplicable = catData.compliantItems + catData.nonCompliantItems;
    let catScore = null;
    let catScoreDisplay = 'N/A';

    if (catApplicable > 0) {
      const catRawScore = (catData.compliantItems / catApplicable) * 100;
      catScore = catRawScore;
      catScoreDisplay = `${catRawScore.toFixed(2)}%`;
    }

    categoryScores.push({
      category: categoryName,
      totalItems: catData.totalItems,
      applicableItems: catApplicable,
      compliantItems: catData.compliantItems,
      nonCompliantItems: catData.nonCompliantItems,
      naItems: catData.naItems,
      score: catScore,
      scoreDisplay: catScoreDisplay
    });
  });

  // Calculate Critical vs General breakdown
  let critTotal = 0, critCompliant = 0, critNonCompliant = 0, critNa = 0;
  let genTotal = 0, genCompliant = 0, genNonCompliant = 0, genNa = 0;

  for (const item of checklist) {
    const isCrit = item.isCritical === true || 
                   ['CL Act', 'PSRGA', 'EPF Act', 'ESI Act'].includes(item.type) ||
                   /(licence|license|registration|wages|pf|esi)/i.test(item.title || item.particulars || '');
    const resp = responseMap.get(item.id);
    const status = resp ? resp.status : 'NA';

    if (isCrit) {
      critTotal += 1;
      if (status === 'COMPLIANT') critCompliant += 1;
      else if (status === 'NON_COMPLIANT') critNonCompliant += 1;
      else if (status === 'NA') critNa += 1;
    } else {
      genTotal += 1;
      if (status === 'COMPLIANT') genCompliant += 1;
      else if (status === 'NON_COMPLIANT') genNonCompliant += 1;
      else if (status === 'NA') genNa += 1;
    }
  }

  const critApplicable = critCompliant + critNonCompliant;
  const critScore = critApplicable > 0 ? (critCompliant / critApplicable) * 100 : null;
  const critical = {
    totalItems: critTotal,
    applicableItems: critApplicable,
    compliantItems: critCompliant,
    nonCompliantItems: critNonCompliant,
    naItems: critNa,
    score: critScore,
    scoreDisplay: critScore !== null ? `${critScore.toFixed(2)}%` : 'N/A'
  };

  const genApplicable = genCompliant + genNonCompliant;
  const genScore = genApplicable > 0 ? (genCompliant / genApplicable) * 100 : null;
  const general = {
    totalItems: genTotal,
    applicableItems: genApplicable,
    compliantItems: genCompliant,
    nonCompliantItems: genNonCompliant,
    naItems: genNa,
    score: genScore,
    scoreDisplay: genScore !== null ? `${genScore.toFixed(2)}%` : 'N/A'
  };

  const summary = {
    totalItems,
    applicableItems,
    compliantItems,
    nonCompliantItems,
    naItems,
    score: overallScore,
    scoreDisplay: overallScoreDisplay
  };

  if (message) {
    summary.message = message;
  }

  return {
    summary,
    categoryScores,
    labourCodes: categoryScores,
    sections: categoryScores,
    critical,
    general,
    nonCompliantItems: nonCompliantDetails
  };
}

module.exports = {
  calculateComplianceScore,
  ValidationError
};
