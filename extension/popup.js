document.addEventListener('DOMContentLoaded', () => {
    const enabledCheckbox = document.getElementById('enabled');
    const yearInput = document.getElementById('year');
    const intervalInput = document.getElementById('interval');
    const saveButton = document.getElementById('save-button');
    const statusMessage = document.getElementById('status-message');
    const monthsGrid = document.getElementById('months-grid');
  
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
    // --- Create the month checkboxes ---
    for (let i = 0; i < monthNames.length; i++) {
      const monthValue = i + 1;
      const label = document.createElement('label');
      label.className = 'month-label';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `month-${monthValue}`;
      checkbox.value = monthValue;
      checkbox.className = 'month-checkbox';
  
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(monthNames[i]));
      monthsGrid.appendChild(label);
    }
    const monthCheckboxes = document.querySelectorAll('.month-checkbox');
    // ---
  
    // Load current settings from storage and populate the form
    chrome.storage.sync.get(['enabled', 'year', 'months', 'interval'], (result) => {
      enabledCheckbox.checked = result.enabled ?? true;
      yearInput.value = result.year ?? new Date().getFullYear();
      intervalInput.value = result.interval ?? 60;
      
      const savedMonths = result.months ?? [new Date().getMonth() + 1]; // Default to current month
      monthCheckboxes.forEach(box => {
        if (savedMonths.includes(parseInt(box.value, 10))) {
          box.checked = true;
        }
      });
    });
  
    // Save settings when the button is clicked
    saveButton.addEventListener('click', () => {
      const selectedMonths = [];
      monthCheckboxes.forEach(box => {
        if (box.checked) {
          selectedMonths.push(parseInt(box.value, 10));
        }
      });
  
      if (selectedMonths.length === 0) {
        statusMessage.textContent = 'Please select at least one month.';
        statusMessage.style.color = 'red';
        setTimeout(() => {
          statusMessage.textContent = '';
          statusMessage.style.color = 'green';
        }, 3000);
        return;
      }
  
      const settings = {
        enabled: enabledCheckbox.checked,
        year: parseInt(yearInput.value, 10),
        months: selectedMonths,
        interval: parseInt(intervalInput.value, 10)
      };
  
      chrome.storage.sync.set(settings, () => {
        statusMessage.textContent = 'Settings saved!';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 2000);
      });
    });
  });