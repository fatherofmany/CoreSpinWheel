// src/services/CoreCreditsService.js
class CoreCreditsService {
  constructor() {
    this.crBalance = 0;
  }

  loadBalance() {
    const stored = localStorage.getItem('coreCredits');
    this.crBalance = stored ? parseInt(stored, 10) : 0;
    return this.crBalance;
  }

  addCredits(amount, reason = '') {
    this.crBalance += amount;
    localStorage.setItem('coreCredits', this.crBalance);
    console.log(`+${amount} Cr awarded for: ${reason}`);
    return this.crBalance;
  }

  getBalance() {
    return this.crBalance;
  }

  reset() {
    this.crBalance = 0;
    localStorage.setItem('coreCredits', this.crBalance);
  }
  trackMilestone(type) {
  const milestones = JSON.parse(localStorage.getItem('crMilestones')) || {};
  milestones[type] = (milestones[type] || 0) + 1;
  localStorage.setItem('crMilestones', JSON.stringify(milestones));
}

getMilestones() {
  return JSON.parse(localStorage.getItem('crMilestones')) || {};
}

resetMilestones() {
  localStorage.removeItem('crMilestones');
}

}



export const CrService = new CoreCreditsService();
