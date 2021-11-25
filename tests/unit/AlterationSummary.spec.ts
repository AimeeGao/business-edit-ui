// Libraries
import Vue from 'vue'
import Vuetify from 'vuetify'
import flushPromises from 'flush-promises'
import sinon from 'sinon'

// Store
import { getVuexStore } from '@/store'

// Components
import { createLocalVue, createWrapper, mount } from '@vue/test-utils'
import { AlterationSummary } from '@/components/Summary'
import { EffectiveDateTime } from '@/components/common'
import { ConfirmDialog } from '@/components/dialogs'
import { NameTranslation } from '@/components/YourCompany/NameTranslations'

Vue.use(Vuetify)
const localVue = createLocalVue()
const vuetify = new Vuetify({})

describe('Alteration Summary component', () => {
  let wrapper: any
  let store: any = getVuexStore()

  const businessSnapshot = {
    businessInfo: {
      legalName: 'Mock Original Name',
      legalType: 'BC'
    }
  }
  const nameTranslationsListChanged = [
    { name: 'First mock name translation ltd.', action: 'edited' },
    { name: 'Second mock name translation inc' },
    { name: 'Third mock name translation ltd.' },
    { name: 'Quatrième nom simulé' }
  ]

  beforeAll(() => {
    // init store
    store.state.stateModel.currentJsDate = new Date('2020-03-01T16:30:00Z')
    store.state.stateModel.tombstone.currentDate = '2021-03-01'
    store.state.stateModel.businessSnapshot = businessSnapshot
    store.state.stateModel.shareStructureStep.shareClasses = []
    store.state.stateModel.businessSnapshot.shareStructure = { shareClasses: [] }
  })

  beforeEach(() => {
    // Set Original business Data
    store.state.stateModel.nameRequest.legalName = businessSnapshot.businessInfo.legalName
    store.state.stateModel.tombstone.entityType = businessSnapshot.businessInfo.legalType
    store.state.stateModel.summaryMode = true
    store.state.stateModel.nameTranslations = nameTranslationsListChanged

    wrapper = mount(AlterationSummary, { vuetify, store, localVue })
  })

  afterEach(() => {
    sinon.restore()
    wrapper.destroy()
  })

  it('renders the components', async () => {
    expect(wrapper.findComponent(AlterationSummary).exists()).toBe(true)
    expect(wrapper.findComponent(EffectiveDateTime).exists()).toBe(true)
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(true)
    expect(wrapper.findComponent(NameTranslation).exists()).toBe(true)
  })

  it('renders the Change and Remove actions', async () => {
    const changeAction = wrapper.find('#btn-change-alteration').text()
    expect(changeAction).toBe('Change')

    const removeAction = wrapper.find('#btn-delete-alteration').text()
    expect(removeAction).toBe('Delete')
  })

  it('reverts out of summaryMode when selecting the change action', async () => {
    expect(store.state.stateModel.summaryMode).toBe(true)

    // Select the Change action
    const changeAction = wrapper.find('#btn-change-alteration')
    changeAction.trigger('click')

    await Vue.nextTick()

    // Verify summaryMode state has changed
    expect(store.state.stateModel.summaryMode).toBe(false)
  })

  it('displays the confirm dialog when selecting Remove action', () => {
    const mock = jest.spyOn(wrapper.vm, 'onDeleteClicked')
    expect(mock).not.toHaveBeenCalled()

    const rootWrapper = createWrapper(wrapper.vm.$root)
    expect(rootWrapper.emitted('delete-all')).toBeUndefined()

    // Select the remove action
    const removeAction = wrapper.find('#btn-delete-alteration')
    removeAction.trigger('click')

    expect(mock).toHaveBeenCalled()
    expect(rootWrapper.emitted('delete-all').length).toBe(1)
  })

  it('does not render the summary sections when no changes have been made', async () => {
    expect(wrapper.find('.business-name-summary').exists()).toBe(false)
    expect(wrapper.find('.business-type-summary').exists()).toBe(false)
  })

  it('renders the name summary section when changes have been made', async () => {
    store.state.stateModel.nameRequest.legalName = 'Mock New Name'
    await Vue.nextTick()

    expect(wrapper.find('.business-name-summary').exists()).toBe(true)
    expect(wrapper.find('.business-name-summary').text()).toContain('Company Name Mock New Name')
  })

  it('renders the type summary section when changes have been made', async () => {
    store.state.stateModel.tombstone.entityType = 'BEN'
    await Vue.nextTick()

    expect(wrapper.find('.business-type-summary').exists()).toBe(true)
    expect(wrapper.find('.business-type-summary').text()).toContain('Changing from a BC Limited Company')
    expect(wrapper.find('.business-type-summary').text()).toContain('to a BC Benefit Company')
  })

  it('renders the default alteration date and time section', async () => {
    store.state.stateModel.effectiveDateTime = {
      isFutureEffective: null,
      dateTimeString: ''
    }
    store.state.stateModel.newAlteration.flagsReviewCertify.isValidEffectiveDate = false
    await Vue.nextTick()

    // verify section
    expect(wrapper.find('.alteration-date-time').exists()).toBe(true)

    // verify info-text paragraph
    expect(wrapper.find('.alteration-date-time .info-text').exists()).toBe(true)
    expect(wrapper.find('.alteration-date-time .info-text').text()).toContain('Select the date and time')

    // verify effective-date-time div only (no the end blurb div)
    expect(wrapper.findAll('.alteration-date-time .v-card').length).toBe(1)
  })

  it('renders the alteration date and time section with end blurb', async () => {
    store.state.stateModel.effectiveDateTime = {
      isFutureEffective: true,
      dateTimeString: '2021-03-05T16:30:00Z'
    }
    store.state.stateModel.newAlteration.flagsReviewCertify.isValidEffectiveDate = true
    await Vue.nextTick()

    // verify end blurb div
    const divs = wrapper.findAll('.alteration-date-time .v-card')
    expect(divs.length).toBe(2)
    expect(divs.at(1).text()).toContain('The alteration for this business will be effective as of:')
    expect(divs.at(1).text()).toContain('March 5, 2021 at 8:30 am Pacific time')
  })

  it('renders Alteration Notice Changes fees accordingly', async () => {
    store.state.stateModel.currentFees = {
      'filingFees': 100.0,
      'filingType': 'Alteration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 101.5
    }
    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Alteration Notice Changes ($100.00 Fee)')

    store.state.stateModel.currentFees = {
      'filingFees': 100.0,
      'filingType': 'Alteration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 100.0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 201.5
    }
    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Alteration Notice Changes ($200.00 Fee)')

    store.state.stateModel.currentFees = {
      filingFees: null,
      filingType: null,
      filingTypeCode: null,
      futureEffectiveFees: null,
      priorityFees: null,
      processingFees: null,
      serviceFees: null,
      tax: {
        pst: null,
        gst: null
      },
      total: null
    }

    await Vue.nextTick()
    expect(wrapper.find('.summary-title').text()).toBe('Alteration Notice Changes')
  })

  it('renders the futureEffective fee correctly', async () => {
    store.state.stateModel.feePrices = {
      'filingFees': 100.0,
      'filingType': 'Alteration',
      'filingTypeCode': 'ALTER',
      'futureEffectiveFees': 100.0,
      'priorityFees': 0,
      'processingFees': 0,
      'serviceFees': 1.5,
      'tax': {
        'gst': 0,
        'pst': 0
      },
      'total': 201.5
    }
    await Vue.nextTick()
    await flushPromises()
    await Vue.nextTick()
    expect(
      wrapper.find('#effective-date-time-instructions').text().replace(/\s+/g, ' ')
    ).toContain('additional fee of $100.00 to enter an alteration date and time in the future).')

    store.state.stateModel.feePrices = {
      filingFees: null,
      filingType: null,
      filingTypeCode: null,
      futureEffectiveFees: null,
      priorityFees: null,
      processingFees: null,
      serviceFees: null,
      tax: {
        pst: null,
        gst: null
      },
      total: null
    }

    await flushPromises()
    expect(
      wrapper.find('#effective-date-time-instructions').text().replace(/\s+/g, ' ')
    ).toContain('additional fee to enter an alteration date and time in the future).')
  })
})
