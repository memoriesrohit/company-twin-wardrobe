// Arrange existing dashboard content beside the one live companion renderer.
// Moving the original nodes preserves their authorized data and event handlers.
const dashboardPanels = {
  '/frontend/employee/index.html': '.progress-section, .dashboard-grid',
  '/frontend/admin/admin.html': '#admin-panel-area',
  '/frontend/superadmin/superadmin.html': '.tab-nav, .tab-content',
};

export function mountLearningLayout(stage, anchor, pathname = location.pathname) {
  const selector = dashboardPanels[pathname];
  if (!selector) return null;
  const content = document.querySelector('main > .content');
  if (!content || content.querySelector('.ahdus-learning-content')) return null;
  const panels = [...content.children].filter(node => node.matches(selector));
  if (!panels.length) return null;

  const main = content.closest('main');
  const panelArea = document.createElement('div');
  panelArea.className = 'ahdus-learning-content';
  const slots = panels.map(panel => {
    const slot = document.createComment('Companion layout: original panel position');
    panel.before(slot);
    return {panel, slot};
  });
  slots[0].slot.before(stage);
  panelArea.append(...panels);
  stage.append(panelArea);
  stage.dataset.layout = 'beside';
  anchor.dataset.layout = 'beside';
  stage.setAttribute('aria-label', 'Your character beside dashboard content');
  main.classList.add('ahdus-dashboard-guide');

  return {
    dispose() {
      for (const {panel, slot} of slots) {
        if (slot.isConnected) slot.replaceWith(panel);
      }
      main.classList.remove('ahdus-dashboard-guide');
      delete stage.dataset.layout;
      delete anchor.dataset.layout;
      panelArea.remove();
    },
  };
}
