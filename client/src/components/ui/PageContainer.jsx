import Navbar from './Navbar'

export default function PageContainer({ children, className = '', navigate, showFooter = true }) {
  return (
    <div className={`page ${className}`.trim()}>
      <Navbar navigate={navigate} />
      <main>{children}</main>
      {showFooter ? (
        <footer className="footer">
          <span>CodeRoom</span>
          <span>Collaborative code editing for focused teams.</span>
        </footer>
      ) : null}
    </div>
  )
}
