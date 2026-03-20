import arrowRightIcon from "@/assets/arrow-right.png"

interface HomeInfoDrawerProps {
  isOpen: boolean
  onToggle: () => void
}

export function HomeInfoDrawer({ isOpen, onToggle }: HomeInfoDrawerProps) {
  const drawerClassName = isOpen ? "home-info-drawer is-open" : "home-info-drawer"

  return (
    <div className={drawerClassName}>
      <div className="home-info-drawer__panel" />

      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse home info drawer" : "Expand home info drawer"}
        className="home-info-drawer__toggle"
        onClick={onToggle}
        type="button"
      >
        <img alt="" aria-hidden="true" className="home-info-drawer__icon" src={arrowRightIcon} />
      </button>
    </div>
  )
}