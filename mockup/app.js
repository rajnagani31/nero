/**
 * Nero Analytics - Greptile UI Mockup Interactive Script
 * Provides full interactive behavior for dropdowns, popovers, filters, and metrics
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // DROPDOWN & POPOVER TOGGLING (GLOBAL CLICK LISTENER)
  // =========================================================================
  const dropdownWrappers = document.querySelectorAll('.dropdown-wrapper, .panel-control-dropdown');

  function closeAllDropdowns() {
    dropdownWrappers.forEach(w => w.classList.remove('open'));
  }

  // Toggle dropdown on button click
  dropdownWrappers.forEach(wrapper => {
    const triggerBtn = wrapper.querySelector('button');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          wrapper.classList.add('open');
        }
      });
    }

    // Prevent clicks inside the popover from closing itself
    const popover = wrapper.querySelector('.popover-panel, .panel-menu');
    if (popover) {
      popover.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  });

  // Clicking outside closes all popovers
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  // =========================================================================
  // REPOSITORIES SEARCH & MULTI-SELECT FILTER (Screenshot 7 & 9)
  // =========================================================================
  const repoSearchInput = document.getElementById('repoSearchInput');
  const repoItems = document.querySelectorAll('.repo-item');
  const repoAllChk = document.getElementById('repoAll');
  const repoCheckboxes = document.querySelectorAll('.repo-chk');
  const reposLabel = document.getElementById('reposLabel');

  // Search filter
  if (repoSearchInput) {
    repoSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      repoItems.forEach(item => {
        const repoName = item.dataset.repo.toLowerCase();
        item.style.display = repoName.includes(query) ? 'flex' : 'none';
      });
    });
  }

  // Update repository label based on checked items
  function updateRepoLabel() {
    const checkedCount = Array.from(repoCheckboxes).filter(chk => chk.checked).length;
    if (checkedCount === repoCheckboxes.length || checkedCount === 0) {
      reposLabel.textContent = 'All repositories';
      repoAllChk.checked = true;
      if (checkedCount === 0) {
        repoCheckboxes.forEach(c => c.checked = true);
      }
    } else if (checkedCount === 1) {
      const checkedOne = Array.from(repoCheckboxes).find(chk => chk.checked);
      reposLabel.textContent = checkedOne.value.split('/')[1] || checkedOne.value;
      repoAllChk.checked = false;
    } else {
      reposLabel.textContent = `${checkedCount} repositories`;
      repoAllChk.checked = false;
    }
  }

  // Master "All repositories" checkbox toggle
  if (repoAllChk) {
    repoAllChk.addEventListener('change', () => {
      const isChecked = repoAllChk.checked;
      repoCheckboxes.forEach(chk => chk.checked = isChecked);
      updateRepoLabel();
    });
  }

  // Individual repository checkboxes
  repoCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const allChecked = Array.from(repoCheckboxes).every(c => c.checked);
      const noneChecked = Array.from(repoCheckboxes).every(c => !c.checked);

      if (noneChecked) {
        // Clearing every item returns to All
        repoCheckboxes.forEach(c => c.checked = true);
        repoAllChk.checked = true;
      } else {
        repoAllChk.checked = allChecked;
      }
      updateRepoLabel();
    });
  });

  // =========================================================================
  // TEAMS FILTER
  // =========================================================================
  const teamAllChk = document.getElementById('teamAll');
  const teamCheckboxes = document.querySelectorAll('.team-chk');
  const teamsLabel = document.getElementById('teamsLabel');

  function updateTeamsLabel() {
    const checkedCount = Array.from(teamCheckboxes).filter(chk => chk.checked).length;
    if (checkedCount === teamCheckboxes.length || checkedCount === 0) {
      teamsLabel.textContent = 'All teams';
      teamAllChk.checked = true;
      if (checkedCount === 0) teamCheckboxes.forEach(c => c.checked = true);
    } else if (checkedCount === 1) {
      const checkedOne = Array.from(teamCheckboxes).find(chk => chk.checked);
      teamsLabel.textContent = checkedOne.value;
      teamAllChk.checked = false;
    } else {
      teamsLabel.textContent = `${checkedCount} teams`;
      teamAllChk.checked = false;
    }
  }

  if (teamAllChk) {
    teamAllChk.addEventListener('change', () => {
      teamCheckboxes.forEach(chk => chk.checked = teamAllChk.checked);
      updateTeamsLabel();
    });
  }

  teamCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const allChecked = Array.from(teamCheckboxes).every(c => c.checked);
      const noneChecked = Array.from(teamCheckboxes).every(c => !c.checked);
      if (noneChecked) {
        teamCheckboxes.forEach(c => c.checked = true);
        teamAllChk.checked = true;
      } else {
        teamAllChk.checked = allChecked;
      }
      updateTeamsLabel();
    });
  });

  // =========================================================================
  // AUTHORS FILTER
  // =========================================================================
  const authorAllChk = document.getElementById('authorAll');
  const authorCheckboxes = document.querySelectorAll('.author-chk');
  const authorsLabel = document.getElementById('authorsLabel');

  function updateAuthorsLabel() {
    const checkedCount = Array.from(authorCheckboxes).filter(chk => chk.checked).length;
    if (checkedCount === authorCheckboxes.length || checkedCount === 0) {
      authorsLabel.textContent = 'All auth...';
      authorAllChk.checked = true;
      if (checkedCount === 0) authorCheckboxes.forEach(c => c.checked = true);
    } else {
      authorsLabel.textContent = `${checkedCount} authors`;
      authorAllChk.checked = false;
    }
  }

  if (authorAllChk) {
    authorAllChk.addEventListener('change', () => {
      authorCheckboxes.forEach(chk => chk.checked = authorAllChk.checked);
      updateAuthorsLabel();
    });
  }

  authorCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const allChecked = Array.from(authorCheckboxes).every(c => c.checked);
      const noneChecked = Array.from(authorCheckboxes).every(c => !c.checked);
      if (noneChecked) {
        authorCheckboxes.forEach(c => c.checked = true);
        authorAllChk.checked = true;
      } else {
        authorAllChk.checked = allChecked;
      }
      updateAuthorsLabel();
    });
  });

  // =========================================================================
  // TIMEFRAME & GRANULARITY POPOVER (Screenshot 8)
  // =========================================================================
  const tfItems = document.querySelectorAll('.tf-item');
  const timeframeLabel = document.getElementById('timeframeLabel');
  const granPills = document.querySelectorAll('.gran-pill');

  tfItems.forEach(item => {
    item.addEventListener('click', () => {
      tfItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const tfValue = item.dataset.tf;
      timeframeLabel.textContent = tfValue;
      closeAllDropdowns();
    });
  });

  granPills.forEach(pill => {
    pill.addEventListener('click', () => {
      granPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // =========================================================================
  // SUMMARY BOX SUB-TABS (Screenshot 6)
  // =========================================================================
  const tabPrReviews = document.getElementById('tabPrReviews');
  const tabBugsCaught = document.getElementById('tabBugsCaught');

  if (tabPrReviews && tabBugsCaught) {
    tabPrReviews.addEventListener('click', () => {
      tabPrReviews.classList.add('active');
      tabBugsCaught.classList.remove('active');
    });

    tabBugsCaught.addEventListener('click', () => {
      tabBugsCaught.classList.add('active');
      tabPrReviews.classList.remove('active');
    });
  }

  // =========================================================================
  // PANEL 1: METRIC DROPDOWN SELECTOR (Screenshot 4 & 5)
  // =========================================================================
  const kpi1Menu = document.getElementById('kpi1MetricMenu');
  const kpi1Label = document.getElementById('kpi1MetricLabel');
  const kpi1YAxis = document.getElementById('kpi1YAxisLabel');

  if (kpi1Menu) {
    const metricItems = kpi1Menu.querySelectorAll('.menu-item');
    metricItems.forEach(item => {
      item.addEventListener('click', () => {
        metricItems.forEach(i => {
          i.classList.remove('active');
          const chk = i.querySelector('.check');
          if (chk) chk.remove();
        });
        item.classList.add('active');
        item.innerHTML = `${item.dataset.metric} <span class="check">✓</span>`;

        const selectedMetric = item.dataset.metric;
        kpi1Label.textContent = selectedMetric;
        kpi1YAxis.textContent = selectedMetric.toUpperCase();
        closeAllDropdowns();
      });
    });
  }

  // =========================================================================
  // PANEL 3: MEDIAN / MEAN DROPDOWN (Screenshot 6)
  // =========================================================================
  const kpi3Menu = document.getElementById('kpi3MedianMenu');
  const kpi3Label = document.getElementById('kpi3MedianLabel');

  if (kpi3Menu) {
    const aggItems = kpi3Menu.querySelectorAll('.menu-item');
    aggItems.forEach(item => {
      item.addEventListener('click', () => {
        aggItems.forEach(i => {
          i.classList.remove('active');
          const chk = i.querySelector('.check');
          if (chk) chk.remove();
        });
        item.classList.add('active');
        item.innerHTML = `${item.dataset.agg} <span class="check">✓</span>`;

        kpi3Label.textContent = item.dataset.agg;
        closeAllDropdowns();
      });
    });
  }

  // =========================================================================
  // EXPORT ACTION BUTTON
  // =========================================================================
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      console.log('Exporting analytics snapshot CSV/PNG...');
      exportBtn.textContent = 'Exporting...';
      setTimeout(() => {
        exportBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>Export</span>
        `;
      }, 800);
    });
  }
});
