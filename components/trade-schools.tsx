"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

type Stage = { label: string; title: string; desc: string; learn: string };

export function TradeSchools() {
  const t = useTranslations("tradeSchools");
  const locale = useLocale();
  const [current, setCurrent] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stages: Stage[] = Array.from({ length: 5 }, (_, index) => ({
    label: t(`stage${index}label`),
    title: t(`stage${index}title`),
    desc: t(`stage${index}desc`),
    learn: t(`stage${index}learn`),
  }));
  const select = (index: number, focus = false) => {
    setCurrent(index);
    if (focus) tabs.current[index]?.focus({ preventScroll: true });
    if (window.innerWidth < 760)
      tabs.current[index]?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 5
        : event.key === "ArrowLeft"
          ? (index + 4) % 5
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 4
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };
  const artifacts = [
    <div key="0">
      <div className="intro-artifact">
        <div className="artifact-header">
          <span>{t("textContractoropsCampaignReview")}</span>
          <b>{t("textReviewMode")}</b>
        </div>
        <div className="contact-summary">
          <span className="contact-avatar">{t("textMo")}</span>
          <div>
            <h4>{t("textMorgan")}</h4>
            <p>{t("textPropertyManagerNearbyRentals")}</p>
          </div>
          <span className="fit-chip">{t("textPlumbingMaintenance")}</span>
        </div>
        <div className="email-artifact">
          <div className="email-meta">
            <span>{t("textTo")}</span>
            <b>{t("textMorgan")}</b>
            <span>{t("textSubject")}</span>
            <b>{t("textALocalPlumbingContact")}</b>
          </div>
          <h4>{t("textHiMorgan")}</h4>
          <p>{t("textIHelpWithLocalPlumbingRepairsWould")}</p>
          <div className="email-sig">
            {t("textAlex")}
            <br />
            <b>{t("textAlexSPlumbing")}</b>
          </div>
        </div>
        <div className="product-split">
          <div>
            <span>{t("textPreparedByContractorops")}</span>
            <b>{t("textBusinessDiscoveryEmailDraft")}</b>
          </div>
          <div>
            <span>{t("textAlexSDecision")}</span>
            <b>{t("textCheckFitApproveTheMessage")}</b>
          </div>
        </div>
        <div className="review-row">
          <span>{t("textMonOct12ApprovalPending")}</span>
          <b>{t("textReadyForReview")}</b>
        </div>
      </div>
    </div>,
    <div key="1">
      <div className="ops-app">
        <aside>
          <b className="ops-mark">
            {t("textC")}
            <span>{t("textContractorops")}</span>
          </b>
          <small>{t("textWorkspace")}</small>
          <span className="">
            {t("text2")}
            <i>{t("textOverview")}</i>
          </span>
          <span className="active">
            {t("text3")}
            <i>{t("textLeads")}</i>
          </span>
          <span className="">
            {t("text4")}
            <i>{t("textSchedule")}</i>
          </span>
          <span className="">
            {t("text5")}
            <i>{t("textQuotes")}</i>
          </span>
          <span className="">
            {t("text6")}
            <i>{t("textInvoices")}</i>
          </span>
          <div className="ops-user">
            {t("textAl")}
            <span>{t("textAlexAlexSPlumbing")}</span>
          </div>
        </aside>
        <main>
          <div className="ops-bar">
            <span>{t("textLeads")}</span>
            <span className="ops-avatar">{t("textAl")}</span>
          </div>
          <div className="ops-body">
            <div className="ops-page-head">
              <div>
                <small>{t("textCustomerManagement")}</small>
                <h4>{t("textLeadInbox")}</h4>
              </div>
              <span className="ops-badge">{t("text1New")}</span>
            </div>
            <div className="ops-inbox">
              <div className="inbox-list">
                <span className="mini-filter">
                  {t("textAllLeads")}
                  <b>{t("textNew")}</b>
                </span>
                <div className="inbox-selected">
                  <b>{t("textMorganPropertyManager")}</b>
                  <span>{t("textWaterHeater2Emails")}</span>
                  <p>{t("textThereIsWaterAroundTheTank")}</p>
                  <small>{t("textReplyReceivedTueOct13")}</small>
                </div>
                <div className="inbox-empty">
                  {t("textCustomerConversations")}
                  <br />
                  {t("textStayInOnePlace")}
                </div>
              </div>
              <div className="inbox-detail">
                <b>{t("textWaterHeaterInspection")}</b>
                <span className="ops-badge">{t("textNew")}</span>
                <small>{t("textEmailSummary")}</small>
                <p>{t("textWaterAroundTheTankCustomerWouldLike")}</p>
                <div className="ops-field">
                  <span>{t("textServiceType")}</span>
                  <b>{t("textPlumbing")}</b>
                </div>
                <div className="ops-field">
                  <span>{t("textNextStep")}</span>
                  <b>{t("textConfirmScopeAvailability")}</b>
                </div>
                <span className="ops-primary">{t("textReviewLead")}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>,
    <div key="2">
      <div className="ops-app">
        <aside>
          <b className="ops-mark">
            {t("textC")}
            <span>{t("textContractorops")}</span>
          </b>
          <small>{t("textWorkspace")}</small>
          <span className="">
            {t("text2")}
            <i>{t("textOverview")}</i>
          </span>
          <span className="">
            {t("text3")}
            <i>{t("textLeads")}</i>
          </span>
          <span className="active">
            {t("text4")}
            <i>{t("textSchedule")}</i>
          </span>
          <span className="">
            {t("text5")}
            <i>{t("textQuotes")}</i>
          </span>
          <span className="">
            {t("text6")}
            <i>{t("textInvoices")}</i>
          </span>
          <div className="ops-user">
            {t("textAl")}
            <span>{t("textAlexAlexSPlumbing")}</span>
          </div>
        </aside>
        <main>
          <div className="ops-bar">
            <span>{t("textSchedule")}</span>
            <span className="ops-avatar">{t("textAl")}</span>
          </div>
          <div className="ops-body">
            <div className="ops-page-head">
              <div>
                <small>{t("textAppointmentPlanning")}</small>
                <h4>{t("textAClearNextStep")}</h4>
              </div>
              <span className="ops-badge">{t("textOct12162026")}</span>
            </div>
            <div className="ops-schedule">
              <div className="week-head">
                <span>
                  {t("textMon")}
                  <small>{t("text12")}</small>
                </span>
                <span>
                  {t("textTue")}
                  <small>{t("text13")}</small>
                </span>
                <span>
                  {t("textWed")}
                  <small>{t("text14")}</small>
                </span>
                <span className="selected">
                  {t("textThu")}
                  <small>{t("text15")}</small>
                </span>
                <span>
                  {t("textFri")}
                  <small>{t("text16")}</small>
                </span>
              </div>
              <div className="week-grid">
                <div className="calendar-event">
                  <small>{t("text910Am")}</small>
                  <b>{t("textVisit")}</b>
                  <span>{t("textMorgan")}</span>
                </div>
              </div>
            </div>
            <div className="ops-job-line">
              <span className="ops-dot"></span>
              <div>
                <b>{t("textVisitDetails")}</b>
                <p>{t("textThuOct15910AmConfirm")}</p>
              </div>
              <span className="ops-badge">{t("textPlanned")}</span>
            </div>
          </div>
        </main>
      </div>
    </div>,
    <div key="3">
      <div className="ops-app">
        <aside>
          <b className="ops-mark">
            {t("textC")}
            <span>{t("textContractorops")}</span>
          </b>
          <small>{t("textWorkspace")}</small>
          <span className="">
            {t("text2")}
            <i>{t("textOverview")}</i>
          </span>
          <span className="">
            {t("text3")}
            <i>{t("textLeads")}</i>
          </span>
          <span className="">
            {t("text4")}
            <i>{t("textSchedule")}</i>
          </span>
          <span className="active">
            {t("text5")}
            <i>{t("textQuotes")}</i>
          </span>
          <span className="">
            {t("text6")}
            <i>{t("textInvoices")}</i>
          </span>
          <div className="ops-user">
            {t("textAl")}
            <span>{t("textAlexAlexSPlumbing")}</span>
          </div>
        </aside>
        <main>
          <div className="ops-bar">
            <span>{t("textQuotes")}</span>
            <span className="ops-avatar">{t("textAl")}</span>
          </div>
          <div className="ops-body">
            <div className="ops-page-head">
              <div>
                <small>{t("textQuoteQ001")}</small>
                <h4>{t("textWaterHeaterReplacement")}</h4>
              </div>
              <span className="ops-badge">{t("quoteStatus")}</span>
            </div>
            <div className="ops-doc-meta">
              <span>
                {t("textPreparedFor")}
                <b>{t("textMorganPropertyManager")}</b>
              </span>
              <span>
                {t("textScope")}
                <b>{t("textReplaceTest")}</b>
              </span>
            </div>
            <div className="ops-table">
              <div className="ops-th">
                <span>{t("textDescription")}</span>
                <span>{t("textQty")}</span>
                <span>{t("textAmount")}</span>
              </div>
              <div>
                <span>{t("textWaterHeaterMaterials")}</span>
                <span>{t("text1")}</span>
                <b>{t("text900")}</b>
              </div>
              <div>
                <span>{t("textInstallationLabor")}</span>
                <span>{t("text1")}</span>
                <b>{t("text450")}</b>
              </div>
            </div>
            <div className="ops-total">
              <span>{t("textSampleTotal")}</span>
              <b>{t("text1350")}</b>
            </div>
            <div className="ops-doc-foot">
              <span>{t("approval")}</span>
              <span className="ops-primary">{t("textPreviewQuote")}</span>
            </div>
          </div>
        </main>
      </div>
    </div>,
    <div key="4">
      <div className="ops-app">
        <aside>
          <b className="ops-mark">
            {t("textC")}
            <span>{t("textContractorops")}</span>
          </b>
          <small>{t("textWorkspace")}</small>
          <span className="">
            {t("text2")}
            <i>{t("textOverview")}</i>
          </span>
          <span className="">
            {t("text3")}
            <i>{t("textLeads")}</i>
          </span>
          <span className="">
            {t("text4")}
            <i>{t("textSchedule")}</i>
          </span>
          <span className="">
            {t("text5")}
            <i>{t("textQuotes")}</i>
          </span>
          <span className="active">
            {t("text6")}
            <i>{t("textInvoices")}</i>
          </span>
          <div className="ops-user">
            {t("textAl")}
            <span>{t("textAlexAlexSPlumbing")}</span>
          </div>
        </aside>
        <main>
          <div className="ops-bar">
            <span>{t("textInvoices")}</span>
            <span className="ops-avatar">{t("textAl")}</span>
          </div>
          <div className="ops-body">
            <div className="ops-page-head">
              <div>
                <small>{t("textInvoiceInv001")}</small>
                <h4>{t("textWaterHeaterReplacement")}</h4>
              </div>
              <span className="ops-badge">{t("textPaid")}</span>
            </div>
            <div className="ops-doc-meta">
              <span>
                {t("textBillTo")}
                <b>{t("textMorganPropertyManager")}</b>
              </span>
              <span>
                {t("textRelatedQuote")}
                <b>{t("textQ001")}</b>
              </span>
            </div>
            <div className="ops-invoice-summary">
              <span>
                {t("textGrandTotal")}
                <b>{t("text1350")}</b>
              </span>
              <span>
                {t("textAmountPaid")}
                <b>{t("text1350")}</b>
              </span>
              <span className="balance">
                {t("textBalanceDue2")}
                <b>{t("text0")}</b>
              </span>
            </div>
            <div className="ops-payment">
              <small>{t("textPaymentHistory")}</small>
              <div>
                <span className="payment-tick">{t("text7")}</span>
                <div>
                  <b>{t("textPaymentRecorded")}</b>
                  <p>{t("textFriOct16AfterCompletedReplacement")}</p>
                </div>
                <strong>{t("text1350")}</strong>
              </div>
            </div>
            <div className="ops-tip">{t("textAnInvoiceSentIsNotTheSame")}</div>
          </div>
        </main>
      </div>
    </div>,
  ];
  return (
    <div className="trade-school">
      <section className="school-hero" id="trade-schools">
        <div className="wrap hero-split">
          <div className="hero-copy">
            <span className="plain-kicker">{t("textForTradeSchoolsTrainingPrograms")}</span>
            <h1>
              {t("textTradeSkills")}
              <br />
              <span>{t("textRealWorldReadiness")}</span>
            </h1>
            <p>{t("textHelpGraduatesBuildAnOnlinePresenceExplore")}</p>
            <div className="hero-proof">
              <b>{t("textTeachTheTradeWeLlHelpWith")}</b>
              <span>{t("textForStudentsStartingAShopOrLearning")}</span>
            </div>
          </div>
          <div className="hero-photo">
            <Image
              src="/api/trade-school-photo"
              unoptimized
              priority
              alt={t("photoAlt")}
              width={900}
              height={600}
            />
            <div className="photo-caption">
              <span>{t("textTheCraftIsTheStart")}</span>
              <b>{t("textTheBusinessIsTheNextLesson")}</b>
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="photo-credit">
            {t("textIllustrativeWorkshopPhotoNotAPartnerSchool")}
            <a
              href="https://www.pexels.com/photo/people-in-a-workshop-5265333/"
              target="_blank"
              rel="noreferrer"
            >
              {t("textJeswinThomasPexels")}
            </a>
          </div>
        </div>
      </section>
      <section className="block" id="journey">
        <div className="wrap">
          <div className="kicker">{t("textReadyForTheFirstCustomer")}</div>
          <h2 className="section-title">
            {t("textOneJobFromHello")}
            <br />
            {t("textToPaidInvoice")}
          </h2>
          <p className="section-sub">{t("textFollowAlexAPlumbingGraduateFromFinding")}</p>
          <div className="journey-demo">
            <div
              className="journey-tabs"
              role="tablist"
              aria-label={t("journeyLabel")}
            >
              {stages.map((stage, index) => (
                <button
                  key={index}
                  ref={(node) => {
                    tabs.current[index] = node;
                  }}
                  id={`tab-${index}`}
                  role="tab"
                  aria-selected={current === index}
                  aria-controls="stage-panel"
                  tabIndex={current === index ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onTabKey(event, index)}
                >
                  <span>0{index + 1}</span>
                  {t(`tab${index}`)}
                </button>
              ))}
            </div>
            <div
              id="stage-panel"
              className="stage-panel"
              role="tabpanel"
              aria-labelledby={`tab-${current}`}
            >
              <div className="stage-copy">
                <span className="stage-label">{stages[current].label}</span>
                <h3>{stages[current].title}</h3>
                <p className="stage-desc">{stages[current].desc}</p>
                <div className="student-learns">
                  <span>{t("textSkillTheyTakeWithThem")}</span>
                  <p className="stage-learn">{stages[current].learn}</p>
                </div>
              </div>
              <div className="stage-screen">
                <div className="screen-top">
                  <span>{t("workflowLabel")}</span>
                  <span>0{current + 1} / 05</span>
                </div>
                <div className="screen-content">{artifacts[current]}</div>
              </div>
            </div>
            <div className="journey-bottom">
              <span>{t("textOneCustomerRecordCarriedThroughAllFive")}</span>
              <button
                className="next-step"
                onClick={() => select((current + 1) % stages.length, true)}
              >
                {t(`next${current}`)}
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="setup-strip">
        <div className="wrap">
          <b>{t("textBeforeTheFirstHello")}</b>
          <p>{t("textAClearOnlinePresenceHelpsPeopleUnderstand")}</p>
          <span>{t("textWebsiteBuilderProposedOfferingGoogleEligibilityApplies")}</span>
        </div>
      </div>
      <section className="block paths-compact" id="schools">
        <div className="wrap">
          <span className="kicker">{t("textTwoPathsUsefulPracticeForBoth")}</span>
          <div className="simple-paths">
            <div>
              <span>{t("textJoiningACrew")}</span>
              <h3>{t("textExplainHowTheJobRuns")}</h3>
              <div className="path-artifacts employee-artifacts">
                <div className="path-doc">
                  <small>{t("textSiteNoteWaterHeater")}</small>
                  <b>{t("textPoolingWaterAtRental")}</b>
                  <dl>
                    <dt>{t("textCustomer")}</dt>
                    <dd>{t("textMorgan")}</dd>
                    <dt>{t("textNextVisit")}</dt>
                    <dd>{t("textInspectionAccessCheck")}</dd>
                  </dl>
                </div>
                <span className="artifact-arrow">{t("text")}</span>
                <div className="path-doc">
                  <small>{t("textCrewHandoffAlex")}</small>
                  <b>{t("textConfirmBeforeWork")}</b>
                  <div className="check-row">{t("textProblemCaptured")}</div>
                  <div className="check-row">{t("textAccessToConfirm")}</div>
                  <div className="check-row">{t("textScopeForCrewReview")}</div>
                </div>
              </div>
              <p>{t("textBringCustomerNotesScopeAndAClear")}</p>
            </div>
            <div>
              <span>{t("textStartingABusiness")}</span>
              <h3>{t("textBeReadyForAFirstCustomer")}</h3>
              <div className="path-artifacts owner-artifacts">
                <div className="path-doc">
                  <small>{t("textEstimateWaterHeater")}</small>
                  <b>{t("textReplacement")}</b>
                  <dl>
                    <dt>{t("textMaterials")}</dt>
                    <dd>{t("text900")}</dd>
                    <dt>{t("textLabor")}</dt>
                    <dd>{t("text450")}</dd>
                  </dl>
                  <strong>{t("text1350")}</strong>
                </div>
                <span className="artifact-arrow">{t("text")}</span>
                <div className="path-doc paid-doc">
                  <small>{t("textInvoiceMorgan")}</small>
                  <b>
                    <span className="paid-pill">{t("textPaid")}</span>
                  </b>
                  <strong>{t("text1350")}</strong>
                  <div className="check-row">{t("textPaymentRecorded")}</div>
                  <div className="balance-line">
                    {t("textBalanceDue")}
                    <b>{t("text0")}</b>
                  </div>
                </div>
              </div>
              <p>{t("textUseTheWorkflowForServicesYouRe")}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="block classroom-v6" id="workshop">
        <div className="wrap">
          <span className="kicker">{t("textTryItInClass")}</span>
          <h2 className="section-title">
            {t("textTwoStudents")}
            <br />
            {t("textOneRealWorldConversation")}
          </h2>
          <p className="section-sub">{t("textOnePlaysMorganTheCustomerOnePlays")}</p>
          <div className="exercise-layout">
            <div className="exercise">
              <span className="sample-label">{t("textSampleExerciseWaterHeaterJob")}</span>
              <div className="exercise-turn customer-turn">
                <span>{t("textMorganCustomer")}</span>
                <p>{t("textWaterIsPoolingAroundTheTankAt")}</p>
              </div>
              <div className="exercise-turn student-turn">
                <span>{t("textAlexStudent")}</span>
                <p>{t("textIsTheLeakStillActiveAndWho")}</p>
              </div>
              <div className="exercise-docs">
                <div>
                  <small>{t("textAfterInspectionSampleEstimate")}</small>
                  <b>{t("textWaterHeaterReplacement")}</b>
                  <p>{t("textMaterials900Labor450")}</p>
                  <strong>{t("text1350")}</strong>
                </div>
                <div>
                  <small>{t("textCustomerReview")}</small>
                  <b>{t("textWhatSIncludedInThePrice")}</b>
                  <p>{t("textStudentExplainsScopeAndChecksTheCustomer")}</p>
                </div>
              </div>
              <p className="exercise-caption">{t("textAskTheRightQuestionReviewTheScope")}</p>
            </div>
            <div className="workshop-outcomes">
              <span className="case-label">{t("textTheClassroomCheck")}</span>
              <h3>{t("textExplainTheNextStep")}</h3>
              <div className="rubric">
                <div>
                  <span>{t("text01")}</span>
                  <section>
                    <b>{t("textBeforeTheVisit")}</b>
                    <p>{t("textConfirmTheProblemAndWhoProvidesAccess")}</p>
                    <small>{t("textOutputVisitBrief")}</small>
                  </section>
                </div>
                <div>
                  <span>{t("text02")}</span>
                  <section>
                    <b>{t("textBeforeTheEstimate")}</b>
                    <p>{t("textExplain900Materials450LaborAndWhat")}</p>
                    <small>{t("textOutputReviewedScope")}</small>
                  </section>
                </div>
                <div>
                  <span>{t("text03")}</span>
                  <section>
                    <b>{t("textAfterTheWork")}</b>
                    <p>{t("textRecordPaymentAndCheckTheBalanceBefore")}</p>
                    <small>{t("textOutput0Balance")}</small>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
        <section className="close-band school-next" id="pilot">
          <div className="wrap">
            <span className="badge">{t("textStartWithOneClass")}</span>
            <h2>{t("textLetSPlanAClassroomDemo")}</h2>
            <p>{t("textBringYourTradeClassSizeAndThe")}</p>
            <a
              className="btn btn-white"
              href="mailto:support@contractorops.ai?subject=Trade%20school%20classroom%20demo"
            >
              {t("textPlanASchoolDemo")}
            </a>
          </div>
        </section>
        <footer className="school-footer">
          <div className="wrap footer-row">
            <div>
              <b>{t("textContractorops")}</b>
              <p>{t("textTheAiFrontOfficeForTheService")}</p>
            </div>
            <nav aria-label={t("footerLabel")}>
              <a href="#trade-schools">{t("textTradeSchools")}</a>
              <a href={`/${locale}/enterprise`} rel="noreferrer">
                {t("textEnterprises")}
              </a>
              <a href="mailto:support@contractorops.ai">{t("textContact")}</a>
            </nav>
          </div>
          <div className="wrap footer-note">{t("textFictionalSampleNotLiveAccountsOrTransactions")}</div>
        </footer>
      </section>
    </div>
  );
                   }
