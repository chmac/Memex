import React from 'react'
import { browser, Storage } from 'webextension-polyfill-ts'

import { StatefulUIElement } from 'src/overview/types'
import Logic, { State, Event } from './logic'
import OnboardingBox from '../../components/onboarding-box'
import OnboardingStep from '../../components/onboarding-step'
import NextStepButton from '../../components/next-step-button'
import SettingsCheckbox from '../../components/settings-checkbox'
import SearchSettings from '../../components/search-settings'
import { STORAGE_KEYS } from 'src/options/settings/constants'
import { SIDEBAR_STORAGE_NAME } from 'src/sidebar-overlay/constants'
import {
    TOOLTIP_STORAGE_NAME,
    KEYBOARDSHORTCUTS_STORAGE_NAME,
    KEYBOARDSHORTCUTS_DEFAULT_STATE,
} from 'src/content-tooltip/constants'
import { OPTIONS_URL } from 'src/constants'
import { SecondaryAction } from 'src/common-ui/components/design-library/actions/SecondaryAction'
import { PrimaryAction } from 'src/common-ui/components/design-library/actions/PrimaryAction'

const styles = require('../../components/onboarding-box.css')
const searchSettingsStyles = require('../../components/search-settings.css')

export interface Props {
    storage: Storage.LocalStorageArea
    navToOverview: () => void
}

export default class OnboardingScreen extends StatefulUIElement<
    Props,
    State,
    Event
> {
    static TOTAL_STEPS = 5
    static defaultProps: Partial<Props> = {
        storage: browser.storage.local,
    }

    constructor(props: Props) {
        super(props, new Logic())
    }

    componentDidMount() {
        this.hydrateStateFromStorage()
    }

    private async hydrateStateFromStorage() {
        const storedVals = await this.props.storage.get([
            ...Object.values(STORAGE_KEYS),
            SIDEBAR_STORAGE_NAME,
            TOOLTIP_STORAGE_NAME,
            KEYBOARDSHORTCUTS_STORAGE_NAME,
        ])

        // Set default vaslues if nothing present in storage
        const defs = this.logic.getInitialState()
        const grabVal = async (key: string, defVal: any) => {
            let enabled: boolean

            if (storedVals[key] == null) {
                enabled = defVal
                await this.props.storage.set({ [key]: enabled })
            } else {
                enabled = storedVals[key]
            }

            return { enabled }
        }

        this.processEvent(
            'setAnnotationsEnabled',
            await grabVal(STORAGE_KEYS.LINKS, defs.areAnnotationsEnabled),
        )
        this.processEvent(
            'setBookmarksEnabled',
            await grabVal(STORAGE_KEYS.BOOKMARKS, defs.areBookmarksEnabled),
        )
        this.processEvent(
            'setVisitsEnabled',
            await grabVal(STORAGE_KEYS.VISITS, defs.areVisitsEnabled),
        )
        this.processEvent(
            'setScreenshotsEnabled',
            await grabVal(STORAGE_KEYS.SCREENSHOTS, defs.areScreenshotsEnabled),
        )
        this.processEvent(
            'setStubsEnabled',
            await grabVal(STORAGE_KEYS.STUBS, defs.areStubsEnabled),
        )
        this.processEvent('setVisitDelay', {
            delay: (await grabVal(STORAGE_KEYS.VISIT_DELAY, defs.visitDelay))
                .enabled as any,
        })
        this.processEvent(
            'setTooltipEnabled',
            await grabVal(TOOLTIP_STORAGE_NAME, defs.isTooltipEnabled),
        )
        this.processEvent(
            'setSidebarEnabled',
            await grabVal(SIDEBAR_STORAGE_NAME, defs.isSidebarEnabled),
        )

        // Keyboard shortcut state is nested
        let shortcutsEnabled = storedVals[KEYBOARDSHORTCUTS_STORAGE_NAME]
        shortcutsEnabled =
            shortcutsEnabled != null
                ? shortcutsEnabled.shortcutsEnabled
                : defs.areShortcutsEnabled

        this.processEvent('setShortcutsEnabled', { enabled: shortcutsEnabled })
    }

    private areAllSettingsChecked() {
        return (
            this.state.areVisitsEnabled &&
            this.state.areBookmarksEnabled &&
            this.state.areAnnotationsEnabled
        )
    }

    private searchImage = () => <img src={'/img/searchImage.gif'} className={styles.searchGif} />
    private annotationImage = () => <img src={'/img/annotationImage.gif'} className={styles.annotationGif} />
    private keyboardImage = () => <img src={'/img/keyboardImage.gif'} className={styles.keyboardGif} />
    private sidebarImage = () => <img src={'/img/sidebarImage.gif'} className={styles.sidebarGif} />
    private mobileImg = () => <img src={'/img/mobileOnboarding.png'} className={styles.mobileImg} />
    private handleTooltipToggle = () => {
        const enabled = !this.state.isTooltipEnabled
        this.processEvent('setTooltipEnabled', { enabled })
        return this.props.storage.set({ [TOOLTIP_STORAGE_NAME]: enabled })
    }

    private handleSidebarToggle = () => {
        const enabled = !this.state.isSidebarEnabled
        this.processEvent('setSidebarEnabled', { enabled })
        return this.props.storage.set({ [SIDEBAR_STORAGE_NAME]: enabled })
    }

    private handleShortcutsToggle = () => {
        const enabled = !this.state.areShortcutsEnabled
        this.processEvent('setShortcutsEnabled', { enabled })

        return this.props.storage.set({
            [KEYBOARDSHORTCUTS_STORAGE_NAME]: {
                ...KEYBOARDSHORTCUTS_DEFAULT_STATE,
                shortcutsEnabled: enabled,
            },
        })
    }

    private handleNextStepClick = () => {
        this.processEvent('setStep', { step: this.state.currentStep + 1 })
    }

    private handleStepClick = (step: number) => () => {
        this.processEvent('setStep', { step })
    }

    private handleShowSearchSettingsToggle = () => {
        const shown = !this.state.showSearchSettings
        this.processEvent('setSearchSettingsShown', { shown })
    }

    private handleAllSettingsToggle = () => {
        const enabled = !this.areAllSettingsChecked()
        this.processEvent('setAnnotationsEnabled', { enabled })
        this.processEvent('setVisitsEnabled', { enabled })
        this.processEvent('setBookmarksEnabled', { enabled })

        return this.props.storage.set({
            [STORAGE_KEYS.LINKS]: enabled,
            [STORAGE_KEYS.VISITS]: enabled,
            [STORAGE_KEYS.BOOKMARKS]: enabled,
        })
    }

    private handleVisitDelayChange = (
        e: React.SyntheticEvent<HTMLInputElement>,
    ) => {
        const el = e.target as HTMLInputElement
        const delay = +el.value

        this.processEvent('setVisitDelay', { delay })
        this.props.storage.set({ [STORAGE_KEYS.VISIT_DELAY]: delay })
    }

    private renderSearchSettings() {
        return (
            <SearchSettings
                visitDelay={this.state.visitDelay}
                stubs={this.state.areStubsEnabled}
                visits={this.state.areVisitsEnabled}
                bookmarks={this.state.areBookmarksEnabled}
                annotations={this.state.areAnnotationsEnabled}
                screenshots={this.state.areScreenshotsEnabled}
                toggleAll={this.handleAllSettingsToggle}
                setVisitDelayChange={this.handleVisitDelayChange}
                showSearchSettings={this.state.showSearchSettings}
                toggleShowSearchSettings={this.handleShowSearchSettingsToggle}
                areAllSettingsChecked={this.areAllSettingsChecked()}
                toggleAnnotations={() => {
                    const enabled = !this.state.areAnnotationsEnabled
                    this.processEvent('setAnnotationsEnabled', { enabled })
                    return this.props.storage.set({
                        [STORAGE_KEYS.LINKS]: enabled,
                    })
                }}
                toggleStubs={() => {
                    const enabled = !this.state.areStubsEnabled
                    this.processEvent('setStubsEnabled', { enabled })
                    return this.props.storage.set({
                        [STORAGE_KEYS.STUBS]: enabled,
                    })
                }}
                toggleVisits={() => {
                    const enabled = !this.state.areVisitsEnabled
                    this.processEvent('setVisitsEnabled', { enabled })
                    return this.props.storage.set({
                        [STORAGE_KEYS.VISITS]: enabled,
                    })
                }}
                toggleBookmarks={() => {
                    const enabled = !this.state.areBookmarksEnabled
                    this.processEvent('setBookmarksEnabled', { enabled })
                    return this.props.storage.set({
                        [STORAGE_KEYS.BOOKMARKS]: enabled,
                    })
                }}
                toggleScreenshots={() => {
                    const enabled = !this.state.areScreenshotsEnabled
                    this.processEvent('setScreenshotsEnabled', { enabled })
                    return this.props.storage.set({
                        [STORAGE_KEYS.SCREENSHOTS]: enabled,
                    })
                }}
            />
        )
    }

    private renderCurrentStep() {
        switch (this.state.currentStep) {
            default:
            case 0:
                return (
                    <OnboardingStep
                        isInitStep
                        titleText="Setup your Memex in less than 1 minute"
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.handleNextStepClick}
                                label={'Get Started'}
                            />
                        )}
                    >
                        <img
                            src="img/privacy.svg"
                            alt="A person floating above the earth on a laptop"
                            className={styles.floatingImage}
                        />
                    </OnboardingStep>
                )
            case 1:
                return (
                    <OnboardingStep
                        goToStep={this.handleStepClick}
                        titleText="Full-Text Search your Web History"
                        subtitleText="Find any website or PDF again without upfront organisation."
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.handleNextStepClick}
                                label={'Next'}
                            />
                        )}
                        renderImage={() => {
                            if (!this.state.showSearchSettings) {
                                return this.searchImage()
                            }
                        }}
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        currentStep={this.state.currentStep - 1}
                    >
                        {this.renderSearchSettings()}
                    </OnboardingStep>
                )
            case 2:
                return (
                    <OnboardingStep
                        goToStep={this.handleStepClick}
                        titleText="Web Annotations"
                        subtitleText="Add highlight and make notes on websites and (soon) PDFs."
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.handleNextStepClick}
                                label={'Next'}
                            />
                        )}
                        renderImage={this.annotationImage}
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        currentStep={this.state.currentStep - 1}
                    >
                        <SettingsCheckbox
                            id="onboarding-tooltip-toggle"
                            isChecked={this.state.isTooltipEnabled}
                            handleChange={this.handleTooltipToggle}
                        >
                            Show Highlighter when selecting text
                        </SettingsCheckbox>
                    </OnboardingStep>
                )
            case 3:
                return (
                    <OnboardingStep
                        goToStep={this.handleStepClick}
                        titleText="Fast & Flexible Content Organisation"
                        subtitleText="Tag, favorite or sort content into collections"
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.handleNextStepClick}
                                label={'Next'}
                            />
                        )}
                        renderImage={this.sidebarImage}
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        currentStep={this.state.currentStep - 1}
                    >
                        <SettingsCheckbox
                            id="onboarding-sidebar-toggle"
                            isChecked={this.state.isSidebarEnabled}
                            handleChange={this.handleSidebarToggle}
                        >
                            Show Sidebar when moving cursor to the right of your
                            screen
                        </SettingsCheckbox>
                    </OnboardingStep>
                )
            case 4:
                return (
                    <OnboardingStep
                        goToStep={this.handleStepClick}
                        titleText="Sync with your mobile Phone"
                        subtitleText="Save, organise & add notes on the go"
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.handleNextStepClick}
                                label={'Next'}
                            />
                        )}
                        renderImage={this.mobileImg}
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        currentStep={this.state.currentStep - 1}
                    >
                        <SecondaryAction
                            onClick={()=> window.open(`${OPTIONS_URL}#/sync`)}
                            label={'Setup Sync'}
                        />
                    </OnboardingStep>
                )
            case 5:
                return (
                    <OnboardingStep
                        goToStep={this.handleStepClick}
                        titleText="Keyboard Shortcuts for Everything"
                        subtitleText="Organise and annotate content without the Highlighter or Sidebar"
                        renderButton={() => (
                            <PrimaryAction 
                                onClick={this.props.navToOverview}
                                label={'All done! Go to dashboard'}
                            />
                        )}
                        renderImage={this.keyboardImage}
                        totalSteps={OnboardingScreen.TOTAL_STEPS}
                        currentStep={this.state.currentStep - 1}
                    >
                        <SecondaryAction
                            onClick={()=> window.open(`${OPTIONS_URL}#/settings`)}
                            label={'Change Shortcuts'}
                        />
                    </OnboardingStep>
                )
        }
    }

    render() {
        return (
            <OnboardingBox {...this.props}>
                {this.renderCurrentStep()}
            </OnboardingBox>
        )
    }
}
