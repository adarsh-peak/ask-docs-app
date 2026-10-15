import { Link } from 'react-router-dom'
import './HowItWorksView.css'

export function HowItWorksView() {
  return (
    <div className="how-it-works-view">
      <div className="how-it-works-toolbar">
        <Link to="/home" className="how-it-works-back">Back to activity</Link>
      </div>
      <iframe
        className="how-it-works-stage"
        src="/ask-docs-demo.html"
        sandbox="allow-scripts"
        title="Ask Docs: documents to cited answers, an illustrative 3D cinematic"
        tabIndex={-1}
      />
    </div>
  )
}
