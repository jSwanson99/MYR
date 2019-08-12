import React from "react";

import {
    Button,
    Icon,
    IconButton,
    Modal
} from "@material-ui/core";

import { withStyles } from "@material-ui/core/styles";
import "../../css/WelcomeScreen.css";
import "../../css/WelcomeScreenIOS.css";

function getOuterModalStyle() {
    const top = 50;
    const left = 50;

    return {
        top: `${top}%`,
        left: `${left}%`,
        transform: `translate(-${top}%, -${left}%)`,
        maxWidth: "90%",
        maxHeight: "90%"
    };
}

// CSS for modal
const modelStyles = theme => ({
    outer: {
        position: "absolute",
        width: theme.spacing.unit * 150,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing.unit * 4,
        "overflow-y": "auto"
    },
    paper: {
        position: "absolute",
        width: theme.spacing.unit * 50,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing.unit * 4,
    },
    info: {
        position: "absolute",
        width: theme.spacing.unit * 100,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing.unit * 4,
    },
    button: {
        margin: theme.spacing.unit,
    }
});

const exitBtnStyle = {
    position: "fixed",
    top: 0,
    right: 0,
};
class WelcomeIOS extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectsOpen: false,
            projectsTab: "b",
            coursesOpen: false
        };
    }

    componentWillMount() {
        //Needed because vr button won't be mounted at the same time as this component, so it will throw an error w/o it 
        window.addEventListener("load", () => {
            if (!this.isIOS() && !this.getCookie("hasVisitedIOS")) {
                this.enableIOSWelcomeScreen();
            }
        });

        console.log("x")
        window.addEventListener("WelcomeClosed", () => {
            console.log("Event Emitter")
            if (!this.isIOS()) {
                this.enableIOSWelcomeScreen();
            }
        });
    }

    enableIOSWelcomeScreen() {
        let enterVRBtn = document.getElementsByClassName("a-enter-vr-button")[0];
        console.log(enterVRBtn)
        const vrBtnCopy = enterVRBtn;
        const newEl = document.createElement("button");
        newEl.classList = vrBtnCopy.classList;
        newEl.onclick = () => {
            this.props.handleWelcomeToggle();
            newEl.replaceWith(vrBtnCopy);
        };
        enterVRBtn.replaceWith(newEl);
    }

    isIOS() {
        return /iPad|iPhone|iPod/.test(window.navigator.platform);
    }

    getCookie = (cookieName) => {
        let name = cookieName + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    setCookie = () => {
        if (!this.getCookie("hasVisitedIOS")) {
            let date = new Date();
            date.setTime(date.getTime() + (1000 * 60 * 60 * 24));
            let expiration = "; expires=" + date.toGMTString();
            let cookie = "hasVisitedIOS=true" + expiration;
            document.cookie = cookie;
        }
    }

    handleClose = () => {
        this.setCookie();
        this.props.handleWelcomeToggle();
        document.querySelector("a-scene").enterVR();
    };

    neverAgainCookie = () => {
        document.cookie = "hasVisitedIOS=true; expires=Thu, 31 Dec 2099 12:00:00 UTC;";
        this.handleClose();
    }

    buttons = () => {
        return (
            <div className="row valign">
                <div className="col-xs-12 col-md-6 col-lg-4 offset-lg-1 " >
                    <Button
                        variant="raised"
                        href="/about/support"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={this.setCookie}
                        className="mui--text-center welcome-btn">
                        <Icon className="material-icons">alternate_email</Icon>
                        Get Support
                    </Button >
                </div >
                <div className="col-xs-12 col-md-6 col-lg-4 offset-lg-1 " >
                    <Button
                        id="neverAgain"
                        onClick={this.neverAgainCookie}
                        className="neverAgain-btn">
                        Don't show again
                    </Button >
                </div >
            </div >

        );
    }

    cookieMessage = () => {
        return (
            <p id="cookie-consent" className="text-center">MYR uses cookies which are necessary for its functioning. You accept the use of cookies by continuing to use MYR per the <a href="/about/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</p>
        );
    }

    render() {
        const { classes } = this.props;

        return (
            this.props.welcomeOpen ?
                <div>
                    <React.Fragment>
                        <Modal
                            aria-labelledby="simple-modal-title"
                            aria-describedby="simple-modal-description"
                            open={this.props.welcomeOpen}
                            onClose={this.handleClose}>
                            <div style={getOuterModalStyle()} className={classes.outer}>
                                <IconButton
                                    color="default"
                                    style={exitBtnStyle}
                                    onClick={this.handleClose}>
                                    <Icon className="material-icons">close</Icon>
                                </IconButton>
                                <h3 className="text-center">Using MYR on iOS</h3>
                                <hr />
                                <p className="text-center">In order to make the most out of your experience with VR, Apple devices require a few changes. </p>
                                <hr />
                                <div className="row no-gutters">
                                    <div className="col-xs-12 col-md-6 col-lg-4 offset-lg-1" >
                                        <p><b>Enable the motion sensors on Safari:</b></p>
                                        <ol>
                                            <li>Go to the "Settings" app</li>
                                            <li>Click on the settings for "Safari"</li>
                                            <li>Enable "Motion and Orientation Access"</li>
                                        </ol>
                                    </div>

                                    <div className="col-xs-12 col-md-6 col-lg-4 offset-lg-1" >
                                        <p><b>Allow our app to go fullscreen by adding it to your home screen:</b></p>
                                        <ol>
                                            <li>Click on the 'share' icon at the bottom bar on Safari</li>
                                            <li>Click on "Add to Home Screen"</li>
                                            <li>Launch MYR from your home screen instead of in your browser</li>
                                        </ol>
                                    </div>
                                </div>
                                <hr />
                                <this.buttons />
                                <hr />
                                <this.cookieMessage />
                                <hr />
                            </div>
                        </Modal>
                    </React.Fragment>
                </div >
                :
                null
        );
    }
}

const WelcomeScreenIOS = withStyles(modelStyles)(WelcomeIOS);

export default WelcomeScreenIOS;