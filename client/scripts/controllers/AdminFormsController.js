/**
 * Admin Forms Controller
 * @desc controls the Admin Forms View
 * @param AdminService
 */
myApp.controller('AdminFormsController', ['$mdDialog', 'AdminService', '$mdPanel', '$sce',
  function($mdDialog, AdminService, $mdPanel, $mdPanelRef, $sce) {
    var forms = this;
    console.log('forms controller sourced');
    /**
     * @global object that limits table's display length
     */
    forms.query = {
      order: 'name',
      limit: 25,
      page: 1
    };

    /**
     * @global array that gets populated with ng-model question prompts
     */
    forms.prompts = {
      form_name: '',
      promptsArray: [{
        question_id: '',
        question: 'On a scale of 1-10 how would you rate your event today?'
      }],
      form_id: '',
    };

    /**
     * @global tells the program whether we are editing the form or not.
     * If the form is being edited it sends the form on a different route.
     */
    forms.editingForm = false;
    /**
     * @global allForms
     */
    forms.allForms = AdminService.allForms;

    /**
     * @global formToAssign
     * @desc stores the data for the form to assign when assign button pressed
     */
    forms.formToAssign = {};

    /**
     * @global assign
     * @desc the form that gets submitted
     */
    forms.assign = {};

    /**
     * @global gradeArray
     * @desc array of grades that go in the assign form grade dropdown
     */
    forms.gradeArray = [ 9, 12 ];

    /**
     * @desc {object} that contains the current year and the unique years with deactivated and all users
     * @return populated by the populateYearDropdown function and used in the Admin User View
     */
    forms.sessionYear = AdminService.sessionYear;

    /**
     * @desc clears all ng-model fields
     */
    forms.clearFields = function() {
      forms.prompts = {
        form_name: '',
        promptsArray: [{
          question_id: '',
          question: 'On a scale of 1-10 how would you rate your event today?'
        }],
        form_id: '',
      };
    };

    /**
     * @function addQuestion
     * @desc adds a question to the form
     * @param empty question string
     * @return pushes new question into promptsArray
     */
    forms.addQuestion = function() {
      var newQuestion = {
        question_id: '',
        question: ''
      };
      forms.prompts.promptsArray.push(newQuestion);
    };

    /**
     * @function removeQuestion
     * @desc removes the most recent question from the form
     * @param
     * @return pops off the last question of the array
     */
    forms.removeQuestion = function() {
      var arr = forms.prompts.promptsArray
      if (forms.editingForm = true && arr.length > 1) {
        var question = arr[arr.length-1];
        if (question.id) {
          AdminService.removeLastQuestion((arr[arr.length - 1]))
          arr.pop();
        } else {
          arr.pop();
        }
      } else if (arr.length > 1) {
        arr.pop();
      } else {
        $mdDialog.show(
          $mdDialog.alert()
          .clickOutsideToClose(true)
          .title('Error')
          .textContent('The form must contain at least 1 question.')
          .ariaLabel('Alert Dialog')
          .ok('OK!')
        );
      }
    }

    /**
     * @function editForm
     * @desc displays an item for editing
     * @param {object} form
     * @return form that is being sent, changes editingForm to true
     */
    forms.editForm = function(form) {
      forms.clearFields();
      forms.editingForm = true;
      console.log('form in editForm ', form);
      forms.prompts = {
        form_name: form.form_name,
        promptsArray: form.questions,
        form_id: form.id
      };
    };

    /**
     * @desc composes and submits a new/edited item
     */
    forms.sendForm = function(form) {
      console.log(form);
      var formToSend = {};
      if (!form.form_name || !form.promptsArray[0]) {
        completeFields();
        return;
      } else {
        formToSend = {
          form_name: form.form_name,
          prompts: [],
          form_id: form.form_id
        };
        for (var i = 0; i < form.promptsArray.length; i++) {
          formToSend.prompts.push(form.promptsArray[i]);
        }
      }
      if (forms.editingForm) {
        forms.editingForm = false;
        AdminService.updateForm(formToSend, function(rows) {
          forms.allForms = rows;
        });
      } else {
        AdminService.addNewForm(form, function(rows) {
          forms.allForms = rows;
        });
      }
      forms.toggleForm();
      forms.clearFields();
    };

    /**
     * @desc displays an alert dialog if a form is incomplete
     */
    function completeFields() {
      $mdDialog.show(
        $mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Incomplete form!')
        .textContent('Please include a form name and at least one question.')
        .ariaLabel('Alert Dialog')
        .ok('OK!')
      );
    }

    /**
     * @desc displays a popup when 'delete' button is clicked, then
     * deletes specific form if popup is confirmed
     * @param {object} form the form to be deleted
     */
    forms.confirmDelete = function(form) {
      var confirm = $mdDialog.confirm()
        .title('Are you sure you want to delete this form?')
        .textContent('This will remove the form forever.')
        .ok('Yes')
        .cancel('No');
      $mdDialog.show(confirm).then(function() {
        AdminService.deleteForm(form.id, function(rows) {
          forms.allForms = rows;
        });
      });
    };

    /**
     * @function assignThisForm
     * @desc copies the form selected to the formToAssign object
     */
    forms.assignThisForm = function ( form ) {
      angular.copy( form, forms.formToAssign );
    };

    /**
     * @function prepareForm
     * @desc prepares the form to send to the DB
     * @param form {object} contains year, grade, start date, end date, form
     * @return calls Adminservice.assignForm to add form to the DB
     */
    forms.prepareForm = function(form) {
      console.log('formToAssign before the change is ', forms.formToAssign);
      var formAssign = {
        year: form.year,
        event: form.event,
        formId: forms.formToAssign.id,
        grade: form.grade,
        date_form_open: form.date_form_open,
        date_form_close: form.date_form_close,
      };
      console.log('form to assign is ', formAssign);
      //sending the form on it's way!
      AdminService.assignForm(formAssign);
      forms.clearAssign();
    };

    /**
     * @function clearAssign
     * @desc resets the {object} formToAssign
     */
    forms.clearAssign = function () {
      var blankObj = {};
      angular.copy( blankObj, forms.formToAssign );
      angular.copy( blankObj, forms.assign);
    };


    /**
     * @function On Key Press
     * @desc when the focus is on the window and the escape key is pressed, the form
     * is closed.
     * @param event
     * @return the @class ng-hide and aria-hidden are added to the form-container.
     * the @function clearFields is called to clear the fields on the form.
     */
    window.onkeydown = function(event) {
      var itemToClose = document.getElementById('form-container');
      if (event.keyCode === 27) {
        itemToClose.classList.add("ng-hide");
        itemToClose.setAttribute("aria-hidden", true);
        forms.clearFields();
      }
    };

    /**
     * @function On click
     * @desc closes popup when clicked outside
     * @param click
     * @return hides the popup form
     */
    document.getElementById('forms-background-darken').onclick = function() {
      var itemToClose = document.getElementById('form-container');
      itemToClose.classList.add('ng-hide');
      itemToClose.setAttribute('aria-hidden', true);
      forms.clearFields();
    };

    /**
     * @function Toggle form
     * @desc toggles the form from visible to hidden.
     * @param used on the ng-click of both the add form and edit form.
     * @return toggles the class ng-hide on form-container.
     */
    forms.toggleForm = function() {
      var itemToOpen = document.getElementById('form-container');
      itemToOpen.classList.toggle("ng-hide");
    };

    /**
     * @function toggleAssign
     * @desc toggles the assign form popup
     * @param used on the assign button
     * @return toggles the class ng-hide on assign-container
     */
    forms.toggleAssign = function() {
      var openAssign = document.getElementById('assign-container');
      openAssign.classList.toggle("ng-hide");
    };

    forms.falseForm = function() {
      forms.editingForm = false;
    };


  }
]);
