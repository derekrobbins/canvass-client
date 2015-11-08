class Page {
    constructor(pageEl) {
        this.$element = $(pageEl);
        this.name = this.$element.data('pmName');
        return this;
    }
    hide() {
        this.$element.removeClass('pm-show');
    }
    show() {
        this.$element.addClass('pm-show');
    }
}

class PageManager {
    constructor(options = { pageClass: 'pm-page', goToClass: 'pm-goto', goBackClass: 'pm-go-back' }) {
        this.options = options;
        this.pages = {};
        this.history = [];
        this.setUpListeners();
        [].slice.call(document.getElementsByClassName(options.pageClass))
            .forEach(this.createPage, this);
        return this;
    }
    createPage(pageEl) {
        let page = new Page(pageEl);
        this.pages[page.name] = page;
    }
    goToPage(identifier, transition) {
        this.history.push(identifier);
        Object.keys(this.pages).forEach((page) => {
            this.pages[page].hide();
        });
        this.pages[identifier].show();
    }
    goBack() {
        this.history.pop()
        this.goToPage(this.history[this.history.length - 1]);
    }
    setUpListeners() {
        $('body').on('click', '.' + this.options.goToClass, (e) => {
            let element = $(e.currentTarget);
            let data = element.data();
            let destination = data.pmGoto;
            e.preventDefault();
            this.goToPage(data.pmGoto);
        });
        $('body').on('click', '.' + this.options.goBackClass, (e) => {
            e.preventDefault();
            this.goBack();
        });
    }
}

export default PageManager;
