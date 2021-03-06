import Guided from "../components/layouts/Guided.js";
import PropTypes from "prop-types";

import * as Actions from "../actions";

import { bindActionCreators } from "redux";
import { connect } from "react-redux";


// This makes sure we are getting what we think we should
Guided.propTypes = {
    editor: PropTypes.object.isRequired,
    user: PropTypes.object,
    scene: PropTypes.object.isRequired,
    lesson: PropTypes.object,
    course: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    editor: state.editor,
    user: state.user.user,
    scene: state.scene,
    lesson: state.courses.currentLesson,
    projects: state.project,
    courses: state.courses,
    course: state.courses.course,
    classrooms: state.classrooms
});

// This maps dispatch actions to props
const mapDispatchToProps = dispatch => ({
    editorActions: bindActionCreators(Actions.EditorActions, dispatch),
    authActions: bindActionCreators(Actions.AuthActions, dispatch),
    sceneActions: bindActionCreators(Actions.SceneActions, dispatch),
    projectActions: bindActionCreators(Actions.ProjectActions, dispatch),
    courseActions: bindActionCreators(Actions.CourseActions, dispatch),
    classroomActions: bindActionCreators(Actions.ClassroomActions, dispatch)
});

// This does the binding to the redux store
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Guided);
