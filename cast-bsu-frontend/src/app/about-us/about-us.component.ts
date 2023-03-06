import {Component, OnInit} from '@angular/core';
import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {faExternalLinkAlt} from '@fortawesome/free-solid-svg-icons';
import {faUserPlus} from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-aboutus',
    templateUrl: './about-us.component.html',
   // styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent implements OnInit {
    faSearch = faSearch;
    faExternalLinkAlt = faExternalLinkAlt;
    faUserPlus = faUserPlus;

    constructor() {
    }

    ngOnInit(): void {
    }

}
