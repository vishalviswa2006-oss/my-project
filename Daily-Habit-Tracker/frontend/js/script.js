document.addEventListener('DOMContentLoaded', () => {
  const setCurrentYear = () => {
    const yearNode = document.getElementById('year');
    if (yearNode) {
      yearNode.textContent = new Date().getFullYear();
    }
  };

  setCurrentYear();
});
